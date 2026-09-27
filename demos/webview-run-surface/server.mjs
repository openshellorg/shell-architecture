#!/usr/bin/env node
/**
 * Serves layout.html once; tails ops.jsonl and fans out via SSE.
 * MIT License — shell-architecture companion demo
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const OPS_PATH = path.join(ROOT, 'runtime', 'ops.jsonl');
const PORT = Number(process.env.PORT || 3847);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
};

/** @type {Set<import('node:http').ServerResponse>} */
const sseClients = new Set();

function ensureRuntimeDir() {
  const dir = path.dirname(OPS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(OPS_PATH)) fs.writeFileSync(OPS_PATH, '', 'utf8');
}

function broadcastSse(line) {
  const payload = `data: ${line}\n\n`;
  for (const res of sseClients) {
    res.write(payload);
  }
}

function tailOpsFile() {
  let offset = 0;
  const pump = () => {
    try {
      const stat = fs.statSync(OPS_PATH);
      if (stat.size < offset) offset = 0;
      if (stat.size > offset) {
        const fd = fs.openSync(OPS_PATH, 'r');
        const len = stat.size - offset;
        const buf = Buffer.alloc(len);
        fs.readSync(fd, buf, 0, len, offset);
        fs.closeSync(fd);
        offset = stat.size;
        const chunk = buf.toString('utf8');
        for (const line of chunk.split('\n')) {
          const trimmed = line.trim();
          if (trimmed) broadcastSse(trimmed);
        }
      }
    } catch {
      /* race on truncate */
    }
  };
  fs.watch(path.dirname(OPS_PATH), { persistent: true }, pump);
  pump();
}

function serveStatic(urlPath, res) {
  const safe = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(ROOT, safe === '/' ? 'layout.html' : safe);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  if (url.pathname === '/ops/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(': connected\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  if (url.pathname === '/ops/reset' && req.method === 'POST') {
    ensureRuntimeDir();
    fs.writeFileSync(OPS_PATH, '', 'utf8');
    res.writeHead(204);
    res.end();
    return;
  }

  let filePath = url.pathname;
  if (filePath === '/') filePath = '/layout.html';
  serveStatic(filePath, res);
});

ensureRuntimeDir();
tailOpsFile();

server.listen(PORT, () => {
  console.log(`webview-run-surface demo: http://localhost:${PORT}/`);
  console.log(`ops log: ${OPS_PATH}`);
});
