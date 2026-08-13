#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Command, Option } from "commander";
import { parseSessionFile } from "./adapters.js";
import { compareSessions } from "./compare.js";
import { DEMO_LEFT, DEMO_RIGHT } from "./demo.js";
import { latestSession, listSessions } from "./discovery.js";
import { renderHtml, renderTerminal } from "./report.js";
import type { Provider, SessionComparison } from "./types.js";

interface OutputOptions { json?: boolean; html?: string }

function writeOutput(comparison: SessionComparison, options: OutputOptions): void {
  if (options.html) {
    const target = path.resolve(options.html);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, renderHtml(comparison), "utf8");
    process.stderr.write(`HTML report written to ${target}\n`);
  }
  process.stdout.write(options.json ? `${JSON.stringify(comparison, null, 2)}\n` : `${renderTerminal(comparison)}\n`);
}

function providerOption(flags: string, description: string): Option {
  return new Option(flags, description).choices(["codex", "claude", "auto"]).default("auto");
}

const program = new Command()
  .name("agent-session-compare")
  .description("A privacy-first diff for Codex and Claude Code sessions")
  .version("0.1.2")
  .showHelpAfterError()
  .addHelpText("after", "\nSession text is never included in terminal, JSON, or HTML output.");

program.command("compare")
  .description("Compare two JSONL session files")
  .argument("<left>", "left session JSONL")
  .argument("<right>", "right session JSONL")
  .addOption(providerOption("--left-provider <provider>", "left schema override"))
  .addOption(providerOption("--right-provider <provider>", "right schema override"))
  .option("--json", "print stable JSON")
  .option("--html <file>", "write a standalone HTML report")
  .action((leftPath: string, rightPath: string, options: OutputOptions & { leftProvider: Provider | "auto"; rightProvider: Provider | "auto" }) => {
    const left = parseSessionFile(leftPath, options.leftProvider === "auto" ? undefined : options.leftProvider);
    const right = parseSessionFile(rightPath, options.rightProvider === "auto" ? undefined : options.rightProvider);
    writeOutput(compareSessions(left, right), options);
  });

program.command("latest")
  .description("Compare the two newest local sessions (Codex by default)")
  .addOption(new Option("--left <provider>", "left provider").choices(["codex", "claude"]).default("codex"))
  .addOption(new Option("--right <provider>", "right provider").choices(["codex", "claude"]).default("codex"))
  .option("--json", "print stable JSON")
  .option("--html <file>", "write a standalone HTML report")
  .action((options: OutputOptions & { left: Exclude<Provider, "unknown">; right: Exclude<Provider, "unknown"> }) => {
    const leftPath = latestSession(options.left);
    const rightPath = latestSession(options.right, options.left === options.right ? leftPath : undefined);
    writeOutput(compareSessions(parseSessionFile(leftPath, options.left), parseSessionFile(rightPath, options.right)), options);
  });

program.command("list")
  .description("List local sessions so you can choose an exact pair")
  .addOption(new Option("--provider <provider>", "session provider").choices(["codex", "claude"]).default("codex"))
  .option("--limit <count>", "maximum sessions to show", "10")
  .option("--json", "print stable JSON")
  .action((options: { provider: Exclude<Provider, "unknown">; limit: string; json?: boolean }) => {
    const limit = Number.parseInt(options.limit, 10);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("--limit must be an integer from 1 to 100");
    const sessions = listSessions(options.provider).slice(0, limit).map((session) => ({
      ...session,
      filePath: session.filePath.startsWith(os.homedir()) ? `~${session.filePath.slice(os.homedir().length)}` : session.filePath,
    }));
    if (options.json) {
      process.stdout.write(`${JSON.stringify(sessions, null, 2)}\n`);
      return;
    }
    if (sessions.length === 0) throw new Error(`No ${options.provider} sessions found`);
    process.stdout.write(`modified (local)         size      session\n`);
    for (const session of sessions) {
      const modified = new Date(session.modifiedAt).toLocaleString("sv-SE").replace("T", " ");
      const size = `${Math.max(1, Math.round(session.sizeBytes / 1024))} KB`.padStart(8);
      process.stdout.write(`${modified}  ${size}  ${session.filePath}\n`);
    }
  });

program.command("demo")
  .description("Render a safe built-in comparison")
  .option("--json", "print stable JSON")
  .option("--html <file>", "write a standalone HTML report")
  .action((options: OutputOptions) => writeOutput(compareSessions(DEMO_LEFT, DEMO_RIGHT), options));

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`agent-session-compare: ${message}\n`);
  process.exitCode = 1;
});
