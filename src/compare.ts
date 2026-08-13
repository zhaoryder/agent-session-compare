import type { SessionComparison, SessionSummary } from "./types.js";

function toolCalls(summary: SessionSummary): number {
  return summary.tools.reduce((total, tool) => total + tool.calls, 0);
}

export function compareSessions(left: SessionSummary, right: SessionSummary): SessionComparison {
  const leftFiles = new Set(left.filesChanged);
  const rightFiles = new Set(right.filesChanged);
  return {
    schemaVersion: 1,
    left,
    right,
    delta: {
      durationMs: right.durationMs - left.durationMs,
      turns: right.turns - left.turns,
      toolCalls: toolCalls(right) - toolCalls(left),
      filesChanged: right.filesChanged.length - left.filesChanged.length,
      errors: right.errors - left.errors,
      totalTokens: right.tokens.total - left.tokens.total,
    },
    sharedFiles: left.filesChanged.filter((file) => rightFiles.has(file)),
    onlyLeftFiles: left.filesChanged.filter((file) => !rightFiles.has(file)),
    onlyRightFiles: right.filesChanged.filter((file) => !leftFiles.has(file)),
  };
}
