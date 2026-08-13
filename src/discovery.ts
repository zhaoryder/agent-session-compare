import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Provider } from "./types.js";

function collectJsonl(directory: string, output: string[]): void {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectJsonl(fullPath, output);
    else if (entry.isFile() && entry.name.endsWith(".jsonl")) output.push(fullPath);
  }
}

export function sessionDirectory(provider: Exclude<Provider, "unknown">): string {
  return provider === "codex"
    ? path.join(os.homedir(), ".codex", "sessions")
    : path.join(os.homedir(), ".claude", "projects");
}

export function latestSession(provider: Exclude<Provider, "unknown">, exclude?: string): string {
  const files: string[] = [];
  const directory = sessionDirectory(provider);
  collectJsonl(directory, files);
  const normalizedExclude = exclude ? path.resolve(exclude) : undefined;
  const candidates = files.filter((file) => path.resolve(file) !== normalizedExclude);
  candidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  const latest = candidates[0];
  if (!latest) throw new Error(`No ${provider} JSONL sessions found under ${directory}`);
  return latest;
}
