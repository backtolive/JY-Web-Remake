#!/usr/bin/env node
import net from 'node:net';
import { consumeResponseLine, makeExecRequest } from './dosbox-x-debugger-protocol.mjs';

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const timeoutIndex = args.indexOf('--timeout');
const port = portIndex >= 0 ? Number(args[portIndex + 1]) : 58991;
const timeoutMs = timeoutIndex >= 0 ? Number(args[timeoutIndex + 1]) : 30000;
const command = args.filter((_, index) => index !== portIndex && index !== portIndex + 1 && index !== timeoutIndex && index !== timeoutIndex + 1).join(' ').trim();

if (!command || !Number.isInteger(port) || port < 1 || port > 65535 || !Number.isFinite(timeoutMs) || timeoutMs < 1) {
  console.error('Usage: node tools/validator/dosbox-x-debugger-control.mjs [--port 58991] [--timeout 30000] <debugger command>');
  process.exit(2);
}

const server = net.createServer();
let socket;
let nextId = 1;
let buffer = '';
let pending;
let settled = false;

const finish = (error, result) => {
  if (settled) return;
  settled = true;
  clearTimeout(timer);
  socket?.destroy();
  server.close();
  if (error) {
    console.error(error.message);
    process.exitCode = 1;
  } else {
    process.stdout.write(result);
  }
};

const timer = setTimeout(() => finish(new Error(`Timed out waiting for DOSBox-X debugger on 127.0.0.1:${port}`)), timeoutMs);

server.on('error', error => finish(error));
server.on('connection', connection => {
  if (socket) {
    connection.destroy();
    return;
  }
  socket = connection;
  socket.setEncoding('utf8');
  socket.on('error', error => finish(error));
  socket.on('close', () => {
    if (!settled) finish(new Error('DOSBox-X closed the debugger control connection before replying'));
  });
  socket.on('data', chunk => {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).replace(/\r$/, '');
      buffer = buffer.slice(newline + 1);
      if (pending) {
        pending = consumeResponseLine(pending, line);
        if (pending.complete) {
          const { output, error: wasError } = pending;
          pending = undefined;
          finish(wasError ? new Error(output || 'DOSBox-X debugger command failed') : undefined, output ? `${output}\n` : '');
        }
      }
    }
  });
  const id = nextId++;
  pending = { id, lines: [], error: false };
  socket.write(makeExecRequest(id, command));
});

server.listen(port, '127.0.0.1', () => {
  console.error(`Waiting for DOSBox-X at 127.0.0.1:${port}; issue: ${command}`);
});
