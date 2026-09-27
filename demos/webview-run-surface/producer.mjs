#!/usr/bin/env node
/**
 * Simulates a CLI producer appending ops to ops.jsonl (separate from layout shell).
 * MIT License — shell-architecture companion demo
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OPS_PATH = path.join(__dirname, 'runtime', 'ops.jsonl');
const PORT = Number(process.env.PORT || 3847);

function appendOp(op) {
  fs.appendFileSync(OPS_PATH, `${JSON.stringify(op)}\n`, 'utf8');
}

async function resetOps() {
  await fetch(`http://127.0.0.1:${PORT}/ops/reset`, { method: 'POST' }).catch(() => {
    fs.mkdirSync(path.dirname(OPS_PATH), { recursive: true });
    fs.writeFileSync(OPS_PATH, '', 'utf8');
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function main() {
  await resetOps();
  await sleep(400);

  appendOp({
    op: 'setText',
    zone: 'progress',
    text: 'Tool run demo-7f3a\nPhase: configure',
  });

  appendOp({
    op: 'clear',
    zone: 'detail',
  });

  const crates = ['core', 'cli', 'parser', 'lsp-bridge', 'wasm-bindings'];
  for (let i = 0; i < crates.length; i++) {
    const name = crates[i];
    const pct = Math.round(((i + 1) / crates.length) * 100);
    appendOp({
      op: 'setText',
      zone: 'progress',
      text: `Tool run demo-7f3a\nPhase: compile (${pct}%)\nCrate: ${name}`,
    });

    for (let line = 0; line < 8; line++) {
      const level = line % 5 === 0 ? 'warn' : line % 7 === 0 ? 'err' : 'info';
      const msg = `rustc --crate ${name} :: item fn process_${line}()`;
      appendOp({
        op: 'appendHtml',
        zone: 'detail',
        html: `<div class="log-line" data-log-line data-level="${level}">${escapeHtml(msg)}</div>`,
      });
      await sleep(35);
    }

    if (name === 'parser') {
      appendOp({
        op: 'appendHtml',
        zone: 'detail',
        html: `<div class="diag-block" data-log-line data-level="err"><code>E0425</code> cannot find value <code>span_map</code> in this scope<br/><small>src/parser.rs:128:9</small></div>`,
      });
    }

    await sleep(120);
  }

  appendOp({
    op: 'setText',
    zone: 'progress',
    text: 'Tool run demo-7f3a\nPhase: finished\n3 warnings, 1 error',
  });

  appendOp({
    op: 'appendHtml',
    zone: 'detail',
    html: `<div class="log-line" data-log-line data-level="ok" data-summary>Build finished — open horizontal scroll for wide lines without terminal wrap.</div>`,
  });

  console.log('Producer done. Ops appended to', OPS_PATH);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
