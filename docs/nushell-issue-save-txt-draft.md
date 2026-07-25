### Describe the solution you'd like

When `save` gets **structured** pipeline data (tables/records) and the destination extension does **not** map to a `to <format>` serializer (e.g. `.txt`, no extension, or an unknown suffix), Nushell should not hard-fail with only `Can't convert to string`.

Prefer one of:

1. **Default serialize** structured input to a stable text format (`json` or `nuon`) and write it, ideally with a short stderr hint: `note: no serializer for .txt; wrote JSON`. Extension still overrides when known (`.csv` → `to csv`, etc.).
2. Or, if defaulting is too magical: **keep the error but make it actionable** — mention `| to json | save …` and `| table | ansi strip | save …` in the message.

Either way: people should not be forced to rename a file to `*.json` just to dump structured data. Filenames are hints; content is the point.

### Describe alternatives you've considered

- Status quo + docs (`ls | to json | save out.txt`, `ls | table | ansi strip | save out.txt`) — works, still a paper cut.
- Always treat `.txt` as `table` render — matches the screen, but embeds ANSI unless stripped; bad for a data dump.
- Remove all extension-based auto-`to` (explicit only) — consistent, but regresses the nice `save foo.json` path.

### Additional context

Related / prior:

- https://github.com/nushell/nushell/issues/7233 — same `cant_convert` on `save` to `.txt`; closed as "use `to json` / `table`"
- https://github.com/nushell/nushell/issues/7078 — pushback on *too much* auto-format from extensions (`.html`)

This is the other side of that coin: known extensions are helpful; unknown ones become a brick wall.

Interactive `ls` looks like text because the REPL pipes through `table`. Internal values are **not** JSON; `.json` triggers convert-then-write via `to json`. The asymmetry (`output.json` works, `output.txt` fails) is what feels overly strict.

```
ls | save -f output.txt   # fails: can't convert record<…> to string
ls | save -f output.json  # works
```
