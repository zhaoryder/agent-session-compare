import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { execFileSync } from "node:child_process";

test("runs the built CLI end to end with sanitized fixtures", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const output = execFileSync(process.execPath, [
    path.join(root, "dist", "cli.js"), "compare",
    path.join(root, "tests", "fixtures", "codex-sanitized.jsonl"),
    path.join(root, "tests", "fixtures", "claude-sanitized.jsonl"),
    "--json",
  ], { cwd: root, encoding: "utf8" });

  const parsed = JSON.parse(output) as { left: { provider: string }; right: { provider: string }; sharedFiles: string[] };
  assert.equal(parsed.left.provider, "codex");
  assert.equal(parsed.right.provider, "claude");
  assert.deepEqual(parsed.sharedFiles, ["src/index.ts"]);
  assert.doesNotMatch(output, /FIXTURE_PRIVATE|workspace[\\/]sample/);
});

test("the default demo presents a single-agent before and after comparison", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const output = execFileSync(process.execPath, [path.join(root, "dist", "cli.js"), "demo", "--json"], { cwd: root, encoding: "utf8" });
  const parsed = JSON.parse(output) as { left: { provider: string; source: string }; right: { provider: string; source: string } };
  assert.equal(parsed.left.provider, "codex");
  assert.equal(parsed.right.provider, "codex");
  assert.match(parsed.left.source, /before/);
  assert.match(parsed.right.source, /after/);
});
