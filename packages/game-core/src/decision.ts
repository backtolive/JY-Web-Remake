/** Versioned, content-neutral JSON decision kernel. No DOS opcode or host eval. */
import { Ajv } from 'ajv';
import { decisionDomainsSchema, decisionStateSchema, decisionTransactionSchema,
  decisionPlanSchema } from './decision-schema.ts';

const ajv = new Ajv({ allErrors: true, strict: true });
const validDomains = ajv.compile(decisionDomainsSchema);
const validState = ajv.compile(decisionStateSchema);
const validTransaction = ajv.compile(decisionTransactionSchema);
const validPlan = ajv.compile(decisionPlanSchema);
export type DecisionValue = number | boolean | string | string[];
export type DecisionValueKind = 'integer' | 'boolean' | 'string' | 'list';
export interface DecisionDomain {
  kind: DecisionValueKind;
  default: DecisionValue;
  min?: number;
  max?: number;
  maxItems?: number;
  unique?: boolean;
  allowedKeys: string[];
  allowedValues?: string[];
}
export interface DecisionSchema { schemaVersion: 1; domains: Record<string, DecisionDomain>; invariants?: DecisionCondition[] }
export interface DecisionState { schemaVersion: 1; revision: number; values: Record<string, Record<string, DecisionValue>> }
export interface DecisionRef { domain: string; key: string }
export type DecisionOperand = { kind: 'literal'; value: DecisionValue } | { kind: 'read'; ref: DecisionRef };
export type DecisionCondition =
  | { op: 'compare'; left: DecisionOperand; relation: 'eq' | 'ne' | 'lt' | 'le' | 'gt' | 'ge'; right: DecisionOperand }
  | { op: 'contains'; list: DecisionOperand; value: DecisionOperand }
  | { op: 'all' | 'any'; conditions: DecisionCondition[] }
  | { op: 'not'; condition: DecisionCondition };
export type DecisionEffect =
  | { op: 'set'; target: DecisionRef; value: DecisionOperand }
  | { op: 'add'; target: DecisionRef; amount: DecisionOperand }
  | { op: 'listAdd' | 'listRemove'; target: DecisionRef; value: DecisionOperand }
  | { op: 'require'; condition: DecisionCondition };
export interface DecisionTransaction { schemaVersion: 1; guards: DecisionCondition[]; effects: DecisionEffect[] }
export interface DecisionChange { target: DecisionRef; before: DecisionValue; after: DecisionValue }
export interface DecisionPlan {
  schemaVersion: 1;
  cases: { when: DecisionCondition; effects: DecisionEffect[] }[];
  otherwise: DecisionEffect[];
}

const idPattern = /^[a-z][a-z0-9.-]*:[a-z0-9][a-z0-9._/-]*$/;
function fail(code: string): never { throw new Error(`DECISION_${code}`); }
function cloneValue(value: DecisionValue): DecisionValue { return Array.isArray(value) ? [...value] : value; }
function validValue(domain: DecisionDomain, value: unknown): value is DecisionValue {
  switch (domain.kind) {
    case 'integer': return Number.isSafeInteger(value) && (value as number) >= (domain.min ?? -1_000_000_000) &&
      (value as number) <= (domain.max ?? 1_000_000_000);
    case 'boolean': return typeof value === 'boolean';
    case 'string': return typeof value === 'string' && value.length <= 1024 &&
      (!domain.allowedValues || domain.allowedValues.includes(value));
    case 'list': return Array.isArray(value) && value.length <= (domain.maxItems ?? 10000) &&
      value.every(item => typeof item === 'string' && item.length <= 160 &&
        (!domain.allowedValues || domain.allowedValues.includes(item))) &&
      (!domain.unique || new Set(value).size === value.length);
    default: return false;
  }
}
function domainFor(schema: DecisionSchema, ref: DecisionRef): DecisionDomain {
  if (!ref || !idPattern.test(ref.domain) || !idPattern.test(ref.key)) fail('REFERENCE');
  const domain = schema.domains[ref.domain];
  if (!domain) fail('DOMAIN');
  if (!domain.allowedKeys.includes(ref.key)) fail('KEY');
  return domain;
}
export function validateDecisionSchema(schema: DecisionSchema): void {
  if (!validDomains(schema) || !schema || schema.schemaVersion !== 1 || !schema.domains || typeof schema.domains !== 'object' ||
      Array.isArray(schema.domains) || Object.keys(schema.domains).length > 128) fail('SCHEMA');
  for (const [id, domain] of Object.entries(schema.domains)) {
    if (!idPattern.test(id) || !domain || !validValue(domain, domain.default) ||
        (domain.kind !== 'integer' && (domain.min !== undefined || domain.max !== undefined)) ||
        (domain.kind !== 'list' && (domain.maxItems !== undefined || domain.unique !== undefined)) ||
        (domain.kind === 'integer' && (domain.min !== undefined && !Number.isSafeInteger(domain.min) ||
          domain.max !== undefined && !Number.isSafeInteger(domain.max) ||
          domain.min !== undefined && domain.max !== undefined && domain.min > domain.max)) ||
        (domain.kind === 'list' && (domain.maxItems !== undefined &&
          (!Number.isInteger(domain.maxItems) || domain.maxItems < 0 || domain.maxItems > 10000))) ||
        (!Array.isArray(domain.allowedKeys) || domain.allowedKeys.length > 100000 ||
          domain.allowedKeys.some(key => typeof key !== 'string' || !idPattern.test(key)) ||
          new Set(domain.allowedKeys).size !== domain.allowedKeys.length) ||
        (domain.allowedValues !== undefined && (domain.kind !== 'string' && domain.kind !== 'list' ||
          !Array.isArray(domain.allowedValues) || domain.allowedValues.length > 100000 ||
          domain.allowedValues.some(value => typeof value !== 'string' || value.length > 160) ||
          new Set(domain.allowedValues).size !== domain.allowedValues.length))) fail('SCHEMA');
  }
}
export function createDecisionState(schema: DecisionSchema): DecisionState {
  validateDecisionSchema(schema);
  const state: DecisionState = { schemaVersion: 1, revision: 0, values: {} };
  validateDecisionState(schema, state);
  return state;
}
export function validateDecisionState(schema: DecisionSchema, state: DecisionState): void {
  validateDecisionSchema(schema);
  if (!validState(state) || !state || state.schemaVersion !== 1 || !Number.isSafeInteger(state.revision) || state.revision < 0 ||
      !state.values || typeof state.values !== 'object' || Array.isArray(state.values)) fail('STATE');
  for (const [domainId, values] of Object.entries(state.values)) {
    const domain = schema.domains[domainId];
    if (!domain || !values || typeof values !== 'object' || Array.isArray(values) || Object.keys(values).length > 100000) fail('STATE');
    for (const [key, value] of Object.entries(values)) {
      if (!idPattern.test(key) || !domain.allowedKeys.includes(key) ||
          !validValue(domain, value)) fail('STATE');
    }
  }
  if (schema.invariants?.some(invariant => !evaluateCondition(schema, state, invariant, 0))) fail('INVARIANT');
}
function readValue(schema: DecisionSchema, state: DecisionState, ref: DecisionRef): DecisionValue {
  const domain = domainFor(schema, ref);
  return cloneValue(state.values[ref.domain]?.[ref.key] ?? domain.default);
}
export function readDecisionValue(schema: DecisionSchema, state: DecisionState, ref: DecisionRef): DecisionValue {
  validateDecisionState(schema, state);
  return readValue(schema, state, ref);
}
function operand(schema: DecisionSchema, state: DecisionState, input: DecisionOperand): DecisionValue {
  if (input?.kind === 'read') return readValue(schema, state, input.ref);
  if (input?.kind === 'literal' && (typeof input.value === 'boolean' ||
      typeof input.value === 'string' && input.value.length <= 1024 ||
      Number.isSafeInteger(input.value) || Array.isArray(input.value) && input.value.length <= 10000 &&
      input.value.every(item => typeof item === 'string' && item.length <= 160))) {
    return cloneValue(input.value);
  }
  return fail('OPERAND');
}
function evaluateCondition(schema: DecisionSchema, state: DecisionState,
  condition: DecisionCondition, depth: number): boolean {
  if (depth > 16 || !condition) fail('CONDITION');
  switch (condition.op) {
    case 'compare': {
      const left = operand(schema, state, condition.left), right = operand(schema, state, condition.right);
      if (condition.relation === 'eq' || condition.relation === 'ne') {
        const equal = JSON.stringify(left) === JSON.stringify(right);
        return condition.relation === 'eq' ? equal : !equal;
      }
      if (typeof left !== 'number' || typeof right !== 'number') fail('COMPARISON_TYPE');
      switch (condition.relation) {
        case 'lt': return left < right; case 'le': return left <= right;
        case 'gt': return left > right; case 'ge': return left >= right;
        default: return fail('COMPARISON');
      }
    }
    case 'contains': {
      const list = operand(schema, state, condition.list), value = operand(schema, state, condition.value);
      if (!Array.isArray(list) || typeof value !== 'string') fail('CONTAINS_TYPE');
      return list.includes(value);
    }
    case 'all': case 'any':
      if (!Array.isArray(condition.conditions) || !condition.conditions.length || condition.conditions.length > 32) fail('CONDITION');
      return condition.op === 'all' ? condition.conditions.every(row => evaluateCondition(schema, state, row, depth + 1)) :
        condition.conditions.some(row => evaluateCondition(schema, state, row, depth + 1));
    case 'not': return !evaluateCondition(schema, state, condition.condition, depth + 1);
    default: return fail('CONDITION');
  }
}
export function evaluateDecision(schema: DecisionSchema, state: DecisionState,
  condition: DecisionCondition, budget = 1000): boolean {
  validateDecisionState(schema, state);
  if (!Number.isInteger(budget) || budget < 1 || budget > 10000 || conditionNodes(condition) > budget) fail('BUDGET');
  return evaluateCondition(schema, state, condition, 0);
}
function conditionNodes(condition: DecisionCondition): number {
  const stack: { value: DecisionCondition; depth: number }[] = [{ value: condition, depth: 0 }];
  const seen = new Set<object>();
  let count = 0;
  while (stack.length) {
    const { value, depth } = stack.pop()!;
    if (!value || typeof value !== 'object' || seen.has(value) || depth > 16 || ++count > 10000) fail('CONDITION');
    seen.add(value);
    if (value.op === 'all' || value.op === 'any') {
      if (!Array.isArray(value.conditions)) fail('CONDITION');
      for (const child of value.conditions) stack.push({ value: child, depth: depth + 1 });
    } else if (value.op === 'not') stack.push({ value: value.condition, depth: depth + 1 });
  }
  return count;
}
/** Every effect acts on a draft. Any failure discards the draft and its changes. */
export function applyDecisionTransaction(schema: DecisionSchema, previous: DecisionState,
  transaction: DecisionTransaction, budget = 1000): { state: DecisionState; changes: DecisionChange[] } {
  validateDecisionState(schema, previous);
  if (!validTransaction(transaction)) fail('TRANSACTION_SCHEMA');
  if (!transaction || transaction.schemaVersion !== 1 || !Array.isArray(transaction.guards) ||
      !Array.isArray(transaction.effects) || !transaction.effects.length ||
      !Number.isInteger(budget) || budget < 1 || budget > 10000 ||
      transaction.effects.length + transaction.guards.reduce((sum, guard) => sum + conditionNodes(guard), 0) +
      transaction.effects.reduce((sum, effect) => sum + (effect.op === 'require' ? conditionNodes(effect.condition) : 0), 0) > budget) fail('BUDGET');
  if (!transaction.guards.every(guard => evaluateCondition(schema, previous, guard, 0))) fail('GUARD');
  const state = structuredClone(previous);
  const changes: DecisionChange[] = [];
  for (const effect of transaction.effects) {
    if (effect.op === 'require') {
      if (!evaluateCondition(schema, state, effect.condition, 0)) fail('REQUIRE');
      continue;
    }
    const domain = domainFor(schema, effect.target);
    const before = readValue(schema, state, effect.target);
    let after: DecisionValue;
    if (effect.op === 'set') after = operand(schema, state, effect.value);
    else if (effect.op === 'add') {
      const amount = operand(schema, state, effect.amount);
      if (typeof before !== 'number' || typeof amount !== 'number') fail('ADD_TYPE');
      after = before + amount;
    } else if (effect.op === 'listAdd' || effect.op === 'listRemove') {
      const value = operand(schema, state, effect.value);
      if (!Array.isArray(before) || typeof value !== 'string') fail('LIST_TYPE');
      if (effect.op === 'listAdd') {
        if (domain.unique && before.includes(value)) fail('LIST_DUPLICATE');
        after = [...before, value];
      } else {
        if (!before.includes(value)) fail('LIST_MISSING');
        after = before.filter(item => item !== value);
      }
    } else return fail('EFFECT');
    if (!validValue(domain, after)) fail('VALUE_RANGE');
    (state.values[effect.target.domain] ??= {})[effect.target.key] = cloneValue(after);
    changes.push({ target: { ...effect.target }, before, after: cloneValue(after) });
  }
  if (!Number.isSafeInteger(state.revision + 1)) fail('REVISION');
  state.revision++;
  validateDecisionState(schema, state);
  return { state, changes };
}

/** First matching case wins. An explicit otherwise path prevents accidental fallthrough. */
export function applyDecisionPlan(schema: DecisionSchema, previous: DecisionState,
  plan: DecisionPlan, budget = 1000): { state: DecisionState; changes: DecisionChange[]; selectedCase: number | 'otherwise' } {
  validateDecisionState(schema, previous);
  if (!validPlan(plan)) fail('PLAN_SCHEMA');
  if (!plan || plan.schemaVersion !== 1 || !Array.isArray(plan.cases) || !Array.isArray(plan.otherwise) ||
      plan.cases.length > 64 || !Number.isInteger(budget) || budget < 1 || budget > 10000) fail('PLAN');
  const conditionCost = plan.cases.reduce((sum, entry) => sum + conditionNodes(entry.when), 0);
  if (conditionCost > budget) fail('BUDGET');
  for (const [index, entry] of plan.cases.entries()) {
    if (!entry || !Array.isArray(entry.effects)) fail('PLAN');
    if (evaluateCondition(schema, previous, entry.when, 0)) {
      if (!entry.effects.length) return { state: structuredClone(previous), changes: [], selectedCase: index };
      return { ...applyDecisionTransaction(schema, previous,
        { schemaVersion: 1, guards: [], effects: entry.effects }, budget - conditionCost), selectedCase: index };
    }
  }
  if (!plan.otherwise.length) return { state: structuredClone(previous), changes: [], selectedCase: 'otherwise' };
  return { ...applyDecisionTransaction(schema, previous,
    { schemaVersion: 1, guards: [], effects: plan.otherwise }, budget - conditionCost), selectedCase: 'otherwise' };
}
