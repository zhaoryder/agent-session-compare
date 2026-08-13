import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Provider } from "./types.js";

export interface SessionCandidate {
  provider: Exclude<Provider, "unknown">;
  filePath: string;
  modifiedAt: string;
  sizeBytes: number;
}

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
  const candidates = listSessions(provider);
  const normalizedExclude = exclude ? path.resolve(exclude) : undefined;
  const latest = candidates.find((candidate) => path.resolve(candidate.filePath) !== normalizedExclude)?.filePath;
  if (!latest) throw new Error(`No ${provider} JSONL sessions found under ${sessionDirectory(provider)}`);
  return latest;
}

export function listSessions(provider: Exclude<Provider, "unknown">): SessionCandidate[] {
  const files: string[] = [];
  collectJsonl(sessionDirectory(provider), files);
  return files.map((filePath) => {
    const stats = fs.statSync(filePath);
    return { provider, filePath, modifiedAt: stats.mtime.toISOString(), sizeBytes: stats.size };
  }).sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}
