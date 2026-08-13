import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { parseSessionText } from "../src/adapters.js";

test("parses Codex metrics without retaining conversation text", () => {
  const secret = "never-print-this-prompt";
  const jsonl = [
    { type: "session_meta", payload: { id: "codex-1", cwd: "/repo", timestamp: "2026-08-13T00:00:00Z" } },
    { type: "event_msg", payload: { type: "user_message", message: secret } },
    { type: "event_msg", payload: { type: "task_started", started_at: "2026-08-13T00:00:01Z" } },
    { type: "response_item", payload: { type: "custom_tool_call", call_id: "a", name: "apply_patch", input: secret } },
    { type: "response_item", payload: { type: "custom_tool_call_output", call_id: "a", output: "{\"success\":false}" } },
    { type: "event_msg", payload: { type: "patch_apply_end", success: true, changes: { "/repo/src/index.ts": { kind: "update" } } } },
    { type: "event_msg", payload: { type: "agent_message", message: secret } },
    { type: "event_msg", payload: { type: "token_count", info: { total_token_usage: { input_tokens: 10, cached_input_tokens: 4, output_tokens: 6, reasoning_output_tokens: 2, total_tokens: 20 } } } },
    { type: "event_msg", payload: { type: "task_complete", duration_ms: 2500, completed_at: "2026-08-13T00:00:04Z" } },
  ].map((record) => JSON.stringify(record)).join("\n");

  const summary = parseSessionText(jsonl, "/private/session.jsonl");
  assert.equal(summary.provider, "codex");
  assert.ok(!JSON.stringify(summary).includes("codex-1"));
  assert.deepEqual(summary.messages, { user: 1, assistant: 1 });
  assert.equal(summary.turns, 1);
  assert.equal(summary.durationMs, 2500);
  assert.equal(summary.tools[0]?.name, "apply_patch");
  assert.equal(summary.tools[0]?.errors, 1);
  assert.deepEqual(summary.filesChanged, ["src/index.ts"]);
  assert.equal(summary.tokens.total, 20);
  assert.ok(!JSON.stringify(summary).includes(secret));
  assert.ok(!JSON.stringify(summary).includes("/private/"));
});

test("parses Claude assistant tool blocks and tool errors", () => {
  const jsonl = [
    { type: "user", sessionId: "claude-1", cwd: "/repo", timestamp: "2026-08-13T00:00:00Z", message: { role: "user", content: "private request" } },
    { type: "assistant", sessionId: "claude-1", timestamp: "2026-08-13T00:00:02Z", message: { role: "assistant", usage: { input_tokens: 12, cache_read_input_tokens: 3, output_tokens: 5 }, content: [{ type: "text", text: "private answer" }, { type: "tool_use", id: "tool-1", name: "Edit", input: { file_path: "/repo/src/app.ts", old_string: "secret" } }] } },
    { type: "user", sessionId: "claude-1", timestamp: "2026-08-13T00:00:03Z", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "tool-1", is_error: true, content: "private error" }] } },
  ].map((record) => JSON.stringify(record)).join("\n");

  const summary = parseSessionText(jsonl, "claude.jsonl");
  assert.equal(summary.provider, "claude");
  assert.equal(summary.turns, 1);
  assert.deepEqual(summary.messages, { user: 1, assistant: 1 });
  assert.deepEqual(summary.filesChanged, ["src/app.ts"]);
  assert.equal(summary.tools[0]?.calls, 1);
  assert.equal(summary.tools[0]?.errors, 1);
  assert.equal(summary.errors, 1);
  assert.deepEqual(summary.tokens, { input: 12, cachedInput: 3, output: 5, reasoning: 0, total: 20 });
  assert.ok(!JSON.stringify(summary).includes("private"));
});

test("skips malformed records and reports an unknown schema", () => {
  const summary = parseSessionText("not-json\n{\"hello\":\"world\"}\n");
  assert.equal(summary.provider, "unknown");
  assert.equal(summary.malformedRecords, 1);
  assert.equal(summary.warnings.length, 2);
});

test("parses sanitized real-shape fixtures and redacts Windows paths", () => {
  const fixture = (name: string) => fs.readFileSync(path.join(import.meta.dirname, "fixtures", name), "utf8");
  const codex = parseSessionText(fixture("codex-sanitized.jsonl"), "codex-sanitized.jsonl");
  const claude = parseSessionText(fixture("claude-sanitized.jsonl"), "claude-sanitized.jsonl");

  assert.equal(codex.provider, "codex");
  assert.deepEqual(codex.filesChanged, ["src/index.ts"]);
  assert.equal(claude.provider, "claude");
  assert.deepEqual(claude.filesChanged, ["src/index.ts"]);
  const output = JSON.stringify({ codex, claude });
  assert.doesNotMatch(output, /FIXTURE_PRIVATE/);
  assert.doesNotMatch(output, /workspace[\\/]sample/);
});

test("handles a large synthetic session without changing metric semantics", () => {
  const line = JSON.stringify({ type: "event_msg", payload: { type: "agent_message", message: "LARGE_PRIVATE_TEXT" } });
  const text = `${JSON.stringify({ type: "session_meta", payload: { cwd: "/repo" } })}\n${Array.from({ length: 20_000 }, () => line).join("\n")}`;
  const summary = parseSessionText(text, "large.jsonl", "codex");
  assert.equal(summary.records, 20_001);
  assert.equal(summary.messages.assistant, 20_000);
  assert.ok(!JSON.stringify(summary).includes("LARGE_PRIVATE_TEXT"));
});
