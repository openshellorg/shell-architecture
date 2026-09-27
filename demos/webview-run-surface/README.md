# Webview run surface (companion demo)

Runnable sketch for the OpenShellOrg **HTML stream console** canon page
([webview-run-surface.adoc](../../docs/modules/ROOT/pages/webview-run-surface.adoc)).

## Quick start

From the repo root:

```bash
pnpm demo:webview-run-surface
```

Or manually:

```bash
node demos/webview-run-surface/server.mjs
# open http://localhost:3847/
node demos/webview-run-surface/producer.mjs
```

## Files

| File | Role |
|------|------|
| `layout.html` | Stable layout shell (loaded once in the webview) |
| `runtime/ops.jsonl` | Append-only op log (created at runtime; gitignored) |
| `lib/run-surface.js` | Client library: SSE watch + DOM patch ops |
| `server.mjs` | Static server + SSE fan-out from `ops.jsonl` |
| `producer.mjs` | Simulates a CLI writing progress + high-frequency detail |

Toggle **Flicker contrast mode** in the page to see whole-zone HTML rewrite per op (anti-pattern).

## License

MIT — same as [shell-architecture](https://github.com/openshellorg/shell-architecture).
