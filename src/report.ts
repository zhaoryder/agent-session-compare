import pc from "picocolors";
import type { SessionComparison, SessionSummary } from "./types.js";
import { escapeHtml } from "./utils.js";

function totalCalls(summary: SessionSummary): number {
  return summary.tools.reduce((total, tool) => total + tool.calls, 0);
}

function duration(ms: number): string {
  if (!ms) return "—";
  const seconds = Math.round(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}

function number(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function row(label: string, left: string | number, right: string | number): string {
  return `${label.padEnd(18)} ${String(left).padStart(13)}  ${String(right).padStart(13)}`;
}

export function renderTerminal(comparison: SessionComparison, color = process.stdout.isTTY): string {
  const paint = color ? pc : { bold: (v: string) => v, cyan: (v: string) => v, magenta: (v: string) => v, dim: (v: string) => v };
  const { left, right } = comparison;
  const lines = [
    paint.bold("agent-session-compare"),
    paint.dim("Metrics only. Prompt and response text never appears in this report."),
    "",
    row("", paint.cyan(left.provider), paint.magenta(right.provider)),
    row("source", left.source, right.source),
    row("duration", duration(left.durationMs), duration(right.durationMs)),
    row("turns", left.turns, right.turns),
    row("messages", left.messages.user + left.messages.assistant, right.messages.user + right.messages.assistant),
    row("tool calls", totalCalls(left), totalCalls(right)),
    row("files changed", left.filesChanged.length, right.filesChanged.length),
    row("errors", left.errors, right.errors),
    row("tokens", left.tokens.total ? number(left.tokens.total) : "—", right.tokens.total ? number(right.tokens.total) : "—"),
    "",
    paint.bold("File overlap"),
    `  shared ${comparison.sharedFiles.length} · only left ${comparison.onlyLeftFiles.length} · only right ${comparison.onlyRightFiles.length}`,
  ];
  const tools = new Set([...left.tools.map((tool) => tool.name), ...right.tools.map((tool) => tool.name)]);
  if (tools.size > 0) {
    lines.push("", paint.bold("Tools"));
    for (const name of [...tools].sort()) {
      const leftMetric = left.tools.find((tool) => tool.name === name);
      const rightMetric = right.tools.find((tool) => tool.name === name);
      lines.push(row(name.slice(0, 18), leftMetric?.calls ?? 0, rightMetric?.calls ?? 0));
    }
  }
  return lines.join("\n");
}

function metric(label: string, left: string | number, right: string | number): string {
  return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(String(left))}</td><td>${escapeHtml(String(right))}</td></tr>`;
}

function fileList(title: string, files: string[], tone: string): string {
  const body = files.length
    ? `<ul>${files.map((file) => `<li>${escapeHtml(file)}</li>`).join("")}</ul>`
    : `<p class="empty">None</p>`;
  return `<section class="files ${tone}"><h3>${escapeHtml(title)} <span>${files.length}</span></h3>${body}</section>`;
}

export function renderHtml(comparison: SessionComparison): string {
  const { left, right } = comparison;
  const payload = JSON.stringify(comparison).replaceAll("<", "\\u003c");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(left.provider)} vs ${escapeHtml(right.provider)} · agent-session-compare</title>
<style>
:root{color-scheme:dark;--bg:#0b0d12;--panel:#141821;--line:#2a3040;--text:#f4f6fb;--muted:#9ba5b7;--cyan:#61dafb;--pink:#ff73b5;--green:#6ee7a8}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 20% 0,#17243c 0,transparent 38%),var(--bg);color:var(--text);font:15px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace}.wrap{max-width:1040px;margin:auto;padding:64px 24px 80px}.eyebrow{color:var(--green);letter-spacing:.12em;text-transform:uppercase;font-size:12px}h1{font:700 clamp(36px,7vw,72px)/1.02 system-ui;margin:12px 0}.sub{color:var(--muted);max-width:700px;font-family:system-ui}.versus{display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:center;margin:42px 0 24px}.agent{background:linear-gradient(145deg,#18202c,#11151c);border:1px solid var(--line);border-radius:18px;padding:24px}.agent.right{text-align:right}.agent b{display:block;font:700 28px system-ui}.agent small{color:var(--muted)}.vs{color:var(--muted);font-weight:800}table{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--line);border-radius:18px;overflow:hidden;display:table}th,td{padding:15px 20px;border-bottom:1px solid var(--line)}th{text-align:left;color:var(--muted);font-weight:500}td{text-align:right;font-weight:700}td:nth-child(2){color:var(--cyan)}td:nth-child(3){color:var(--pink)}tr:last-child>*{border:0}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:24px}.files{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px;min-width:0}.files h3{font:650 15px system-ui;margin:0 0 14px}.files h3 span{float:right;color:var(--muted)}ul{padding-left:20px;margin:0;overflow-wrap:anywhere}.empty{color:var(--muted)}footer{margin-top:34px;color:var(--muted);font-family:system-ui;font-size:13px}.privacy{display:inline-block;padding:7px 10px;border:1px solid #255b42;background:#12271e;color:var(--green);border-radius:999px}@media(max-width:720px){.grid{grid-template-columns:1fr}.versus{grid-template-columns:1fr}.vs{text-align:center}.agent.right{text-align:left}.wrap{padding-top:38px}}
</style></head><body><main class="wrap"><div class="eyebrow">Deterministic session diff</div><h1>Same task.<br>Different agent.</h1><p class="sub">Compare the work, not the vibes. This static report contains aggregate metrics and redacted file paths—never prompt or response text.</p>
<div class="versus"><div class="agent"><small>LEFT</small><b>${escapeHtml(left.provider)}</b><small>${escapeHtml(left.source)}</small></div><div class="vs">VS</div><div class="agent right"><small>RIGHT</small><b>${escapeHtml(right.provider)}</b><small>${escapeHtml(right.source)}</small></div></div>
<table><tbody>${metric("Duration", duration(left.durationMs), duration(right.durationMs))}${metric("Turns", left.turns, right.turns)}${metric("Messages", left.messages.user + left.messages.assistant, right.messages.user + right.messages.assistant)}${metric("Tool calls", totalCalls(left), totalCalls(right))}${metric("Files changed", left.filesChanged.length, right.filesChanged.length)}${metric("Errors", left.errors, right.errors)}${metric("Tokens", left.tokens.total ? number(left.tokens.total) : "Not reported", right.tokens.total ? number(right.tokens.total) : "Not reported")}</tbody></table>
<div class="grid">${fileList("Shared files", comparison.sharedFiles, "shared")}${fileList(`Only ${left.provider}`, comparison.onlyLeftFiles, "left")}${fileList(`Only ${right.provider}`, comparison.onlyRightFiles, "right")}</div>
<footer><span class="privacy">Local-only · no telemetry · text excluded</span><p>Generated by agent-session-compare v0.1.0</p></footer></main><script type="application/json" id="comparison">${payload}</script></body></html>`;
}
