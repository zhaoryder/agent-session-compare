<div align="center">
  <img src="docs/hero.svg" alt="agent-session-compare — same task, different agent" width="820">
  <p><strong>A privacy-first diff for Codex and Claude Code sessions.</strong></p>
  <p>
    <a href="https://github.com/zhaoryder/agent-session-compare/actions/workflows/ci.yml"><img src="https://github.com/zhaoryder/agent-session-compare/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-6ee7a8" alt="MIT License"></a>
    <img src="https://img.shields.io/badge/telemetry-none-61dafb" alt="No telemetry">
  </p>
</div>

You ran the same task with two coding agents. One felt faster. The other looked busier. Which one actually used fewer turns, hit fewer errors, and touched the intended files?

`agent-session-compare` turns local JSONL logs into a deterministic terminal diff or a standalone HTML report. It compares observable work and deliberately avoids a subjective “winner” score.

## Try it in 30 seconds

No account, API key, or session file is needed for the built-in demo:

```bash
npx --yes github:zhaoryder/agent-session-compare demo
```

Export the same comparison as a single offline HTML file:

```bash
npx --yes github:zhaoryder/agent-session-compare demo --html report.html
```

When both tools are installed locally, compare their newest sessions:

```bash
npx --yes github:zhaoryder/agent-session-compare latest \
  --left codex \
  --right claude \
  --html report.html
```

Or point at any two logs:

```bash
agent-session-compare compare first.jsonl second.jsonl
agent-session-compare compare first.jsonl second.jsonl --json
```

## What it measures

| Signal | Codex | Claude Code | Notes |
| --- | :---: | :---: | --- |
| Turns and messages | ✓ | ✓ | Structural records, not message text |
| Tool calls and tool errors | ✓ | ✓ | Grouped by tool name |
| Files changed | ✓ | ✓ | Patch events and edit/write tools |
| Elapsed time | ✓ | ✓ | Native duration when present, timestamps otherwise |
| Token usage | ✓ | ✓ | Shown only when the log reports it |
| Standalone HTML | ✓ | ✓ | No external scripts, fonts, or analytics |

Metrics are intentionally descriptive. A shorter session is not automatically a better session, and different providers may account for tokens differently.

## Privacy model

Session logs can contain source code, prompts, tool output, and local paths. This tool is designed around that risk:

- It runs locally and makes no network requests.
- Prompt, response, reasoning, tool input, and tool output text are never copied into reports.
- Absolute paths outside the recorded working directory become `<absolute>/filename`.
- JSON and HTML use the same redacted summary schema.
- There is no telemetry and no AI model call.

Still treat the original JSONL files as sensitive. Review an HTML or JSON report before sharing it, especially when filenames are confidential.

## Commands

```text
agent-session-compare demo [--json] [--html report.html]
agent-session-compare latest [--left codex|claude] [--right codex|claude]
agent-session-compare compare <left.jsonl> <right.jsonl>
  [--left-provider auto|codex|claude]
  [--right-provider auto|codex|claude]
  [--json] [--html report.html]
```

Default discovery paths:

- Codex: `~/.codex/sessions/**/*.jsonl`
- Claude Code: `~/.claude/projects/**/*.jsonl`

Schemas evolve. Unknown records are skipped, malformed lines are counted, and the report includes warnings instead of silently inventing metrics.

## Why this exists

Agent tooling has plenty of session browsers and replay UIs. Pairwise comparison is a different job: answer a narrow question with a small, reviewable artifact.

Good uses include:

- comparing prompts or `AGENTS.md` changes across repeated tasks;
- checking whether a new workflow reduced retries and tool errors;
- attaching neutral execution evidence to an agent-evaluation issue;
- discussing agent behavior without uploading the underlying conversation.

This is not a benchmark harness, live monitor, session migrator, or LLM judge.

## Development

```bash
npm install
npm run check
npm test
npm run build
node dist/cli.js demo --html reports/demo.html
```

Node.js 20 or newer is required. The public library API exports the parsers, discovery helpers, comparison function, and renderers from `agent-session-compare`.

## Roadmap

- fixture corpus covering additional Codex and Claude Code log versions;
- optional `--task` labels for repeated experiments;
- machine-readable comparison thresholds for CI;
- adapters contributed for other local coding agents.

See [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a new adapter. Small, sanitized fixtures are especially valuable.

## License

[MIT](LICENSE) © 2026 zhaoryder
