<div align="center">
  <img src="https://raw.githubusercontent.com/zhaoryder/agent-session-compare/main/docs/hero.svg" alt="agent-session-compare — compare two coding-agent runs" width="820">
  <p><strong>See whether your next coding-agent run actually got better.</strong></p>
  <p>
    <a href="https://github.com/zhaoryder/agent-session-compare/actions/workflows/ci.yml"><img src="https://github.com/zhaoryder/agent-session-compare/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
    <a href="https://www.npmjs.com/package/agent-session-compare"><img src="https://img.shields.io/npm/v/agent-session-compare?color=ff73b5" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/agent-session-compare"><img src="https://img.shields.io/npm/dm/agent-session-compare?color=61dafb" alt="npm downloads"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-6ee7a8" alt="MIT License"></a>
    <img src="https://img.shields.io/badge/telemetry-none-61dafb" alt="No telemetry">
  </p>
</div>

You changed `AGENTS.md`, rewrote a prompt, or tried a new workflow. The next Codex run felt better—but was it?

`agent-session-compare` compares two local coding-agent sessions and shows what changed: turns, tool calls, errors, files touched, elapsed time, and reported tokens. You only need one agent. Comparing Codex with itself is the default; comparing Codex with Claude Code is optional.

## Try it in 30 seconds

Preview the report with safe built-in data:

```bash
npx agent-session-compare demo
```

Compare your two newest Codex sessions:

```bash
npx agent-session-compare latest
```

Or list recent sessions and choose an exact pair:

```bash
npx agent-session-compare list
agent-session-compare compare <before.jsonl> <after.jsonl>
```

Save a standalone report you can inspect or share:

```bash
npx agent-session-compare latest --html report.html
```

<img src="https://raw.githubusercontent.com/zhaoryder/agent-session-compare/main/docs/report-demo.png" alt="Standalone HTML report comparing two coding-agent sessions" width="900">

> [!WARNING]
> `latest` selects sessions by file modification time. It cannot know whether both sessions performed the same task. Check the source filenames before treating the result as a before/after comparison.

## Useful experiments

Run the same small task twice and change one thing:

- before and after editing `AGENTS.md`;
- a vague prompt versus a prompt with acceptance criteria;
- a fresh run versus a run using a reusable skill;
- one Codex model or reasoning setting versus another;
- Codex versus Claude Code, if you use both.

Then point the CLI at the exact session files:

```bash
agent-session-compare compare before.jsonl after.jsonl
agent-session-compare compare before.jsonl after.jsonl --json
agent-session-compare compare before.jsonl after.jsonl --html report.html
```

For an optional cross-agent comparison:

```bash
agent-session-compare latest --left codex --right claude
```

## What it measures

| Signal | What it tells you |
| --- | --- |
| Turns and messages | How much back-and-forth the run needed |
| Tool calls and errors | Whether the agent worked cleanly or retried repeatedly |
| Files changed | Whether both runs stayed near the intended scope |
| Elapsed time | How long the recorded work took |
| Token usage | The amount reported by the provider, when available |
| File overlap | Which files both runs touched and which were unique |

These are clues, not a quality score. A shorter run can still produce worse code, and providers may count tokens differently. The tool deliberately does not declare a winner.

## Privacy

Session logs can contain source code, prompts, tool output, and local paths. This project treats the original files as sensitive:

- After installation, comparisons run locally with no runtime network requests.
- Reports never include prompt, response, reasoning, tool input, or tool output text.
- Absolute paths outside the recorded working directory become `<absolute>/filename`.
- Terminal, JSON, and HTML use the same redacted summary.
- There is no telemetry and no model call.

Filenames can still be confidential. Review any generated report before sharing it.

## Commands

```text
agent-session-compare demo [--json] [--html report.html]
agent-session-compare list [--provider codex|claude] [--limit 10] [--json]
agent-session-compare latest [--left codex|claude] [--right codex|claude]
agent-session-compare compare <left.jsonl> <right.jsonl>
  [--left-provider auto|codex|claude]
  [--right-provider auto|codex|claude]
  [--json] [--html report.html]
```

Default discovery paths:

- Codex: `~/.codex/sessions/**/*.jsonl`
- Claude Code: `~/.claude/projects/**/*.jsonl`

Unknown records are skipped, malformed lines are counted, and warnings appear instead of invented metrics. The current parser reads each input file into memory; avoid untrusted or unexpectedly large logs.

## Scope

This project is a small, reviewable session diff. It is not a benchmark harness, live monitor, session browser, migrator, or LLM judge.

The library API exports the parsers, discovery helpers, comparison function, and renderers for tools that need the normalized metrics.

## Development

```bash
npm install
npm run check
npm run build
npm test
node dist/cli.js demo --html reports/demo.html
```

Node.js 20 or newer is required. See [CONTRIBUTING.md](CONTRIBUTING.md) before proposing an adapter; small, sanitized fixtures are especially useful.

## Roadmap

- task labels for repeatable before/after experiments;
- streaming support for very large logs;
- adapters contributed for other local coding agents.

## License

[MIT](LICENSE) © 2026 zhaoryder
