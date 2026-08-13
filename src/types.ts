export type Provider = "codex" | "claude" | "unknown";

export interface TokenUsage {
  input: number;
  cachedInput: number;
  output: number;
  reasoning: number;
  total: number;
}

export interface ToolMetric {
  name: string;
  calls: number;
  errors: number;
  durationMs: number;
}

export interface SessionSummary {
  schemaVersion: 1;
  provider: Provider;
  source: string;
  startedAt?: string;
  endedAt?: string;
  durationMs: number;
  turns: number;
  messages: { user: number; assistant: number };
  tools: ToolMetric[];
  filesChanged: string[];
  errors: number;
  tokens: TokenUsage;
  records: number;
  malformedRecords: number;
  warnings: string[];
}

export interface SessionComparison {
  schemaVersion: 1;
  left: SessionSummary;
  right: SessionSummary;
  delta: {
    durationMs: number;
    turns: number;
    toolCalls: number;
    filesChanged: number;
    errors: number;
    totalTokens: number;
  };
  sharedFiles: string[];
  onlyLeftFiles: string[];
  onlyRightFiles: string[];
}
