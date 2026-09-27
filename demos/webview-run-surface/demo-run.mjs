#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const server = spawn(process.execPath, [path.join(__dirname, 'server.mjs')], {
  stdio: 'inherit',
  env: process.env,
});

function shutdown(code = 0) {
  server.kill('SIGTERM');
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

setTimeout(() => {
  const producer = spawn(process.execPath, [path.join(__dirname, 'producer.mjs')], {
    stdio: 'inherit',
    env: process.env,
  });
  producer.on('exit', (c) => {
    console.log('\nProducer exited. Server still at http://localhost:3847/ — Ctrl+C to stop.');
  });
}, 800);

server.on('exit', (c) => process.exit(c ?? 0));
