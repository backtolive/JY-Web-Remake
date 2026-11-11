export function makeControlRequest(id, action, command = '') {
  const normalizedAction = typeof action === 'string' ? action.toUpperCase() : '';
  if (!Number.isInteger(id) || id < 1 || !['PING', 'BREAK', 'EXEC'].includes(normalizedAction)) {
    throw new Error('INVALID_DEBUGGER_REQUEST');
  }
  if (normalizedAction === 'EXEC') {
    if (typeof command !== 'string' || !command.trim() || /[\r\n]/.test(command)) {
      throw new Error('INVALID_DEBUGGER_REQUEST');
    }
    return `REQ ${id} EXEC ${command.trim()}\n`;
  }
  if (command !== '') throw new Error('INVALID_DEBUGGER_REQUEST');
  return `REQ ${id} ${normalizedAction}\n`;
}

export function makeExecRequest(id, command) {
  return makeControlRequest(id, 'EXEC', command);
}

export function consumeResponseLine(pending, line) {
  if (line === `BEGIN ${pending.id} OK`) return { ...pending, error: false };
  if (line === `BEGIN ${pending.id} ERR`) return { ...pending, error: true };
  if (line === `END ${pending.id}`) {
    return { ...pending, complete: true, output: pending.lines.join('\n') };
  }
  if (line.startsWith('BEGIN ') || line.startsWith('END ')) return pending;
  return { ...pending, lines: [...pending.lines, line] };
}
