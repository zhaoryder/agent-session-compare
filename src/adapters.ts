import fs from "node:fs";
import path from "node:path";
import type { Provider, SessionSummary, TokenUsage, ToolMetric } from "./types.js";
import { asNumber, asRecord, asString, isErrorLike, safeRelative, toTimestamp } from "./utils.js";

interface MutableSummary {
  provider: Provider;
  source: string;
  cwd: string | undefined;
  timestamps: number[];
  durationMs: number;
  turns: number;
  userMessages: number;
  assistantMessages: number;
  tools: Map<string, ToolMetric>;
  pendingTools: Map<string, string>;
  files: Set<string>;
  errors: number;
  tokens: TokenUsage;
  records: number;
  malformedRecords: number;
  warnings: string[];
}

const EMPTY_TOKENS = (): TokenUsage => ({ input: 0, cachedInput: 0, output: 0, reasoning: 0, total: 0 });

function createMutable(source: string): MutableSummary {
  return {
    provider: "unknown",
    source: path.basename(source), cwd: undefined,
    timestamps: [], durationMs: 0, turns: 0, userMessages: 0, assistantMessages: 0,
    tools: new Map(), pendingTools: new Map(), files: new Set(), errors: 0,
    tokens: EMPTY_TOKENS(), records: 0, malformedRecords: 0, warnings: [],
  };
}

function addTool(summary: MutableSummary, name: string, error = false, durationMs = 0): void {
  const key = name || "unknown_tool";
  const current = summary.tools.get(key) ?? { name: key, calls: 0, errors: 0, durationMs: 0 };
  current.calls += 1;
  current.errors += error ? 1 : 0;
  current.durationMs += durationMs;
  summary.tools.set(key, current);
}

function markToolError(summary: MutableSummary, name: string): void {
  const current = summary.tools.get(name);
  if (current) current.errors += 1;
  summary.errors += 1;
}

function captureTimestamp(summary: MutableSummary, ...values: unknown[]): void {
  for (const value of values) {
    const timestamp = toTimestamp(value);
    if (timestamp !== undefined) summary.timestamps.push(timestamp);
  }
}

function updateCodexTokens(summary: MutableSummary, info: unknown): void {
  const usage = asRecord(asRecord(info)?.total_token_usage);
  if (!usage) return;
  summary.tokens = {
    input: asNumber(usage.input_tokens),
    cachedInput: asNumber(usage.cached_input_tokens),
    output: asNumber(usage.output_tokens),
    reasoning: asNumber(usage.reasoning_output_tokens),
    total: asNumber(usage.total_tokens),
  };
}

function captureFile(summary: MutableSummary, value: unknown): void {
  const filePath = asString(value);
  if (filePath) summary.files.add(safeRelative(filePath, summary.cwd));
}

function parseCodex(summary: MutableSummary, record: Record<string, unknown>): void {
  const payload = asRecord(record.payload) ?? {};
  const envelopeType = asString(record.type);
  const type = asString(payload.type);
  captureTimestamp(summary, record.timestamp, payload.timestamp, payload.started_at, payload.completed_at);

  if (envelopeType === "session_meta") {
    summary.cwd = asString(payload.cwd);
    return;
  }
  if (envelopeType === "turn_context" && !summary.cwd) summary.cwd = asString(payload.cwd);
  if (envelopeType === "event_msg") {
    if (type === "user_message") summary.userMessages += 1;
    if (type === "agent_message") summary.assistantMessages += 1;
    if (type === "task_started") summary.turns += 1;
    if (type === "task_complete") {
      summary.durationMs += asNumber(payload.duration_ms);
      if (payload.error) summary.errors += 1;
    }
    if (type === "turn_aborted") {
      summary.durationMs += asNumber(payload.duration_ms);
      summary.errors += 1;
    }
    if (type === "token_count") updateCodexTokens(summary, payload.info);
    if (type === "patch_apply_end") {
      const changes = asRecord(payload.changes);
      for (const filePath of Object.keys(changes ?? {})) captureFile(summary, filePath);
      if (payload.success === false || payload.status === "failed") summary.errors += 1;
    }
    return;
  }
  if (envelopeType !== "response_item") return;

  if (type === "custom_tool_call" || type === "function_call") {
    const name = asString(payload.name) ?? "unknown_tool";
    const callId = asString(payload.call_id);
    addTool(summary, name);
    if (callId) summary.pendingTools.set(callId, name);
    return;
  }
  if (type === "custom_tool_call_output" || type === "function_call_output") {
    const callId = asString(payload.call_id);
    const toolName = callId ? summary.pendingTools.get(callId) : undefined;
    if (toolName && isErrorLike(payload.output)) markToolError(summary, toolName);
  }
}

function updateClaudeTokens(summary: MutableSummary, message: Record<string, unknown>): void {
  const usage = asRecord(message.usage);
  if (!usage) return;
  const input = asNumber(usage.input_tokens);
  const cached = asNumber(usage.cache_read_input_tokens) + asNumber(usage.cache_creation_input_tokens);
  const output = asNumber(usage.output_tokens);
  summary.tokens.input += input;
  summary.tokens.cachedInput += cached;
  summary.tokens.output += output;
  summary.tokens.total += input + cached + output;
}

function captureClaudeToolFiles(summary: MutableSummary, name: string, input: unknown): void {
  if (!/^(Edit|Write|MultiEdit|NotebookEdit|apply_patch)$/i.test(name)) return;
  const data = asRecord(input);
  captureFile(summary, data?.file_path ?? data?.path ?? data?.notebook_path);
  const edits = Array.isArray(data?.edits) ? data.edits : [];
  for (const edit of edits) captureFile(summary, asRecord(edit)?.file_path);
}

function parseClaude(summary: MutableSummary, record: Record<string, unknown>): void {
  captureTimestamp(summary, record.timestamp);
  summary.cwd ??= asString(record.cwd);
  const type = asString(record.type);
  const message = asRecord(record.message) ?? {};
  const content = Array.isArray(message.content) ? message.content : [];

  if (type === "assistant") {
    summary.assistantMessages += 1;
    updateClaudeTokens(summary, message);
    for (const item of content) {
      const block = asRecord(item);
      if (block?.type !== "tool_use") continue;
      const name = asString(block.name) ?? "unknown_tool";
      addTool(summary, name);
      const id = asString(block.id);
      if (id) summary.pendingTools.set(id, name);
      captureClaudeToolFiles(summary, name, block.input);
    }
    return;
  }
  if (type === "user") {
    const toolResults = content.filter((item) => asRecord(item)?.type === "tool_result");
    if (toolResults.length === 0) {
      summary.userMessages += 1;
      summary.turns += 1;
    }
    for (const item of toolResults) {
      const block = asRecord(item) ?? {};
      const id = asString(block.tool_use_id);
      const name = id ? summary.pendingTools.get(id) : undefined;
      if (name && (block.is_error === true || isErrorLike(block.content))) markToolError(summary, name);
    }
  }
}

function detectProvider(records: Record<string, unknown>[]): Provider {
  if (records.some((record) => ["session_meta", "event_msg", "response_item", "turn_context"].includes(asString(record.type) ?? ""))) return "codex";
  if (records.some((record) => "sessionId" in record || "parentUuid" in record)) return "claude";
  return "unknown";
}

function finalize(summary: MutableSummary): SessionSummary {
  const sorted = summary.timestamps.sort((a, b) => a - b);
  const first = sorted[0];
  const last = sorted.at(-1);
  const elapsed = first !== undefined && last !== undefined ? Math.max(0, last - first) : 0;
  if (summary.provider === "unknown") summary.warnings.push("Unrecognized session schema; metrics may be incomplete.");
  if (summary.malformedRecords > 0) summary.warnings.push(`${summary.malformedRecords} malformed JSONL record(s) skipped.`);
  const result: SessionSummary = {
    schemaVersion: 1,
    provider: summary.provider,
    source: summary.source,
    durationMs: summary.durationMs || elapsed,
    turns: summary.turns,
    messages: { user: summary.userMessages, assistant: summary.assistantMessages },
    tools: [...summary.tools.values()].sort((a, b) => b.calls - a.calls || a.name.localeCompare(b.name)),
    filesChanged: [...summary.files].sort(),
    errors: summary.errors,
    tokens: summary.tokens,
    records: summary.records,
    malformedRecords: summary.malformedRecords,
    warnings: summary.warnings,
  };
  if (first !== undefined) result.startedAt = new Date(first).toISOString();
  if (last !== undefined) result.endedAt = new Date(last).toISOString();
  return result;
}

export function parseSessionText(text: string, source = "session.jsonl", provider?: Provider): SessionSummary {
  const summary = createMutable(source);
  const records: Record<string, unknown>[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    summary.records += 1;
    try {
      const parsed = JSON.parse(line) as unknown;
      const record = asRecord(parsed);
      if (record) records.push(record); else summary.malformedRecords += 1;
    } catch {
      summary.malformedRecords += 1;
    }
  }
  summary.provider = provider ?? detectProvider(records);
  for (const record of records) {
    if (summary.provider === "codex") parseCodex(summary, record);
    else if (summary.provider === "claude") parseClaude(summary, record);
  }
  return finalize(summary);
}

export function parseSessionFile(filePath: string, provider?: Provider): SessionSummary {
  return parseSessionText(fs.readFileSync(filePath, "utf8"), filePath, provider);
}
