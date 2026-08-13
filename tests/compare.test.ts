import assert from "node:assert/strict";
import test from "node:test";
import { compareSessions } from "../src/compare.js";
import { DEMO_LEFT, DEMO_RIGHT } from "../src/demo.js";
import { renderHtml, renderTerminal } from "../src/report.js";

test("computes stable deltas and file overlap", () => {
  const comparison = compareSessions(DEMO_LEFT, DEMO_RIGHT);
  assert.equal(comparison.delta.durationMs, 76000);
  assert.equal(comparison.delta.toolCalls, 4);
  assert.deepEqual(comparison.sharedFiles, ["src/cli.ts", "tests/cli.test.ts"]);
  assert.deepEqual(comparison.onlyLeftFiles, ["src/index.ts"]);
  assert.deepEqual(comparison.onlyRightFiles, ["src/report.ts"]);
  assert.equal(comparison.left.provider, "codex");
  assert.equal(comparison.right.provider, "codex");
});

test("renders terminal and standalone HTML reports", () => {
  const comparison = compareSessions(DEMO_LEFT, DEMO_RIGHT);
  const terminal = renderTerminal(comparison, false);
  const html = renderHtml(comparison);
  assert.match(terminal, /Metrics only/);
  assert.match(terminal, /33,000/);
  assert.match(html, /<!doctype html>/);
  assert.match(html, /Local-only/);
  assert.match(html, /before-agents-md/);
  assert.match(html, /after-agents-md/);
  assert.match(html, /application\/json/);
  assert.doesNotMatch(html, /https?:\/\/[^<]*\.(js|css)/);
  assert.doesNotMatch(html, /FIXTURE_PRIVATE|\/Users\/|C:\\workspace/);
});
