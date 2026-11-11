import test from 'node:test';
import assert from 'node:assert/strict';
import { consumeResponseLine, makeControlRequest, makeExecRequest } from '../../tools/validator/dosbox-x-debugger-protocol.mjs';

test('debugger EXEC request uses the documented line protocol', () => {
  assert.equal(makeExecRequest(3, '  BPINT 21  '), 'REQ 3 EXEC BPINT 21\n');
  assert.throws(() => makeExecRequest(0, 'HELP'), /INVALID_DEBUGGER_REQUEST/);
  assert.throws(() => makeExecRequest(1, 'RUN\nREQ 2 EXEC CPU'), /INVALID_DEBUGGER_REQUEST/);
});

test('debugger PING and BREAK use protocol control requests without command payloads', () => {
  assert.equal(makeControlRequest(1, 'PING'), 'REQ 1 PING\n');
  assert.equal(makeControlRequest(2, 'BREAK'), 'REQ 2 BREAK\n');
  assert.throws(() => makeControlRequest(3, 'BREAK', 'ignored'), /INVALID_DEBUGGER_REQUEST/);
  assert.throws(() => makeControlRequest(4, 'INVALID'), /INVALID_DEBUGGER_REQUEST/);
});

test('debugger response collects lines and recognizes errors', () => {
  let response = { id: 7, lines: [], error: false };
  response = consumeResponseLine(response, 'BEGIN 7 OK');
  response = consumeResponseLine(response, 'DEBUG: registers');
  response = consumeResponseLine(response, 'DEBUG: CS:IP');
  response = consumeResponseLine(response, 'END 7');
  assert.equal(response.complete, true);
  assert.equal(response.error, false);
  assert.equal(response.output, 'DEBUG: registers\nDEBUG: CS:IP');

  response = consumeResponseLine({ id: 9, lines: [], error: false }, 'BEGIN 9 ERR');
  response = consumeResponseLine(response, 'command not recognized');
  response = consumeResponseLine(response, 'END 9');
  assert.equal(response.complete, true);
  assert.equal(response.error, true);
  assert.equal(response.output, 'command not recognized');
});
