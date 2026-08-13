---
name: compare-agent-sessions
description: Compare local Codex and Claude Code JSONL sessions with agent-session-compare. Use when a user asks to compare coding-agent runs, export a private session diff, inspect tool/error/file/token metrics, or evaluate repeated agent workflows without exposing conversation text.
---

# Compare agent sessions

1. Confirm `agent-session-compare` is available, or run it from the repository with `node dist/cli.js` after `npm run build`.
2. Use `demo` when the user wants to preview the report without reading local sessions.
3. Use `latest --left codex --right claude` only when the user explicitly wants their newest local sessions compared.
4. Use `compare <left.jsonl> <right.jsonl>` when the user supplies exact files.
5. Add `--html <path>` for a shareable offline report or `--json` for downstream analysis.
6. Report missing provider data as unavailable. Do not infer a winner from duration or token totals.

Never copy, display, upload, or commit original session logs. Review generated JSON or HTML for sensitive filenames before sharing it. The CLI excludes message and tool payload text, but filenames can still be confidential.
