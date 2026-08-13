import path from "node:path";

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function toTimestamp(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value > 1e12 ? value : value * 1000;
  if (typeof value !== "string") return undefined;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function safeRelative(filePath: string, cwd?: string): string {
  if (!path.isAbsolute(filePath)) return normalizePath(filePath);
  if (cwd) {
    const relative = path.relative(cwd, filePath);
    if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) return normalizePath(relative);
  }
  return `<absolute>/${path.basename(filePath)}`;
}

export function normalizePath(filePath: string): string {
  return filePath.replaceAll("\\", "/").replace(/^\.\//, "");
}

export function isErrorLike(value: unknown): boolean {
  const record = asRecord(value);
  if (record?.isError === true || record?.is_error === true || record?.success === false) return true;
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false;
  try { return isErrorLike(JSON.parse(trimmed)); } catch { return false; }
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character] ?? character);
}
