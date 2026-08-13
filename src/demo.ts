import type { SessionSummary } from "./types.js";

export const DEMO_LEFT: SessionSummary = {
  schemaVersion: 1, provider: "codex", source: "before-agents-md.jsonl",
  startedAt: "2026-08-13T02:00:00.000Z", endedAt: "2026-08-13T02:03:12.000Z",
  durationMs: 192000, turns: 5, messages: { user: 5, assistant: 9 },
  tools: [
    { name: "exec_command", calls: 8, errors: 1, durationMs: 45000 },
    { name: "apply_patch", calls: 4, errors: 0, durationMs: 9000 },
  ],
  filesChanged: ["src/cli.ts", "src/index.ts", "tests/cli.test.ts"], errors: 1,
  tokens: { input: 18500, cachedInput: 9200, output: 4100, reasoning: 1200, total: 33000 },
  records: 164, malformedRecords: 0, warnings: [],
};

export const DEMO_RIGHT: SessionSummary = {
  schemaVersion: 1, provider: "codex", source: "after-agents-md.jsonl",
  startedAt: "2026-08-13T02:10:00.000Z", endedAt: "2026-08-13T02:14:28.000Z",
  durationMs: 268000, turns: 6, messages: { user: 6, assistant: 12 },
  tools: [
    { name: "exec_command", calls: 11, errors: 2, durationMs: 52000 },
    { name: "apply_patch", calls: 5, errors: 0, durationMs: 12000 },
  ],
  filesChanged: ["src/cli.ts", "src/report.ts", "tests/cli.test.ts"], errors: 2,
  tokens: { input: 22300, cachedInput: 6100, output: 5300, reasoning: 0, total: 33700 },
  records: 203, malformedRecords: 0, warnings: [],
};
