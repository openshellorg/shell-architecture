/**
 * OpenShellOrg — webview run surface (companion library sketch)
 * MIT License — same as shell-architecture repo
 *
 * Loads a stable layout shell once; applies append-only ops from a JSONL log.
 * Filesystem writes to ops.jsonl are transport — not document.write / full reload.
 */

const DEFAULT_OPS = ['appendHtml', 'setHtml', 'setText', 'update', 'clear'];

/**
 * @typedef {Object} RunSurfaceOptions
 * @property {Record<string, HTMLElement>} zones - map of zone id → container element
 * @property {(op: object) => void} [onOp] - called after each applied op
 * @property {boolean} [flickerContrast] - if true, re-parse whole zone HTML each op (demo only)
 */

/**
 * Apply one op record to named zones.
 * @param {RunSurfaceOptions} ctx
 * @param {object} op
 */
export function applyOp(ctx, op) {
  if (!op || typeof op.op !== 'string') return;
  if (!DEFAULT_OPS.includes(op.op) && op.op !== 'batch') {
    console.warn('[run-surface] unknown op', op.op);
    return;
  }

  if (op.op === 'batch' && Array.isArray(op.ops)) {
    for (const child of op.ops) applyOp(ctx, child);
    return;
  }

  const zoneId = op.zone;
  const el = zoneId ? ctx.zones[zoneId] : null;
  if (!el && op.op !== 'clear') {
    console.warn('[run-surface] missing zone', zoneId);
    return;
  }

  switch (op.op) {
    case 'clear':
      if (el) el.replaceChildren();
      break;
    case 'setText':
      if (el) el.textContent = op.text ?? '';
      break;
    case 'setHtml':
      if (ctx.flickerContrast) {
        el.innerHTML = op.html ?? '';
      } else {
        el.replaceChildren(...htmlToFragment(op.html ?? ''));
      }
      break;
    case 'appendHtml': {
      const frag = htmlToFragment(op.html ?? '');
      if (ctx.flickerContrast) {
        el.innerHTML = (el.innerHTML || '') + (op.html ?? '');
      } else {
        el.append(...frag.childNodes.length ? [...frag.childNodes] : []);
      }
      break;
    }
    case 'update': {
      const target = el?.querySelector?.(op.selector);
      if (!target) break;
      if (op.html != null) {
        if (ctx.flickerContrast) {
          target.outerHTML = op.html;
        } else {
          const repl = htmlToFragment(op.html);
          target.replaceWith(...repl.childNodes.length ? [...repl.childNodes] : []);
        }
      } else if (op.text != null) {
        target.textContent = op.text;
      }
      break;
    }
    default:
      break;
  }

  ctx.onOp?.(op);
}

/**
 * @param {string} html
 * @returns {DocumentFragment}
 */
export function htmlToFragment(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  return tpl.content;
}

/**
 * Split HTML into chunks at top-level node boundaries (never split inside a node).
 * Stub for Zed/Lapce-style range loading — first cut returns one chunk per root node.
 *
 * @param {string} html
 * @param {number} [maxNodesPerChunk]
 * @returns {string[]}
 */
export function chunkHtmlAtNodeBoundaries(html, maxNodesPerChunk = 50) {
  const frag = htmlToFragment(html);
  const nodes = [...frag.childNodes];
  if (nodes.length === 0) return html ? [html] : [];

  const chunks = [];
  let batch = [];
  for (const node of nodes) {
    const wrap = document.createElement('div');
    wrap.appendChild(node.cloneNode(true));
    batch.push(wrap.innerHTML);
    if (batch.length >= maxNodesPerChunk) {
      chunks.push(batch.join('\n'));
      batch = [];
    }
  }
  if (batch.length) chunks.push(batch.join('\n'));
  return chunks;
}

/**
 * Subscribe to newline-delimited JSON ops via EventSource (SSE).
 *
 * @param {string} streamUrl
 * @param {(op: object) => void} onOp
 * @returns {() => void} disconnect
 */
export function watchOpsViaSse(streamUrl, onOp) {
  const es = new EventSource(streamUrl);
  es.onmessage = (ev) => {
    try {
      const op = JSON.parse(ev.data);
      onOp(op);
    } catch (e) {
      console.warn('[run-surface] bad SSE payload', e);
    }
  };
  es.onerror = () => {
    /* browser reconnects; demo server is long-lived */
  };
  return () => es.close();
}

/**
 * Filter visible log lines in a zone by substring (case-insensitive).
 *
 * @param {HTMLElement} container
 * @param {string} query
 * @param {string} [lineSelector]
 */
export function filterZoneLines(container, query, lineSelector = '[data-log-line]') {
  const q = query.trim().toLowerCase();
  const lines = container.querySelectorAll(lineSelector);
  for (const line of lines) {
    const text = line.textContent?.toLowerCase() ?? '';
    const show = !q || text.includes(q);
    line.hidden = !show;
  }
}

/**
 * Wire zones + SSE into a live surface.
 *
 * @param {RunSurfaceOptions & { streamUrl: string }} options
 * @returns {{ disconnect: () => void, setFlickerContrast: (on: boolean) => void }}
 */
export function createRunSurface(options) {
  const ctx = {
    zones: options.zones,
    onOp: options.onOp,
    flickerContrast: Boolean(options.flickerContrast),
  };

  const disconnect = watchOpsViaSse(options.streamUrl, (op) => applyOp(ctx, op));

  return {
    disconnect,
    setFlickerContrast(on) {
      ctx.flickerContrast = Boolean(on);
    },
    applyOp(op) {
      applyOp(ctx, op);
    },
  };
}
