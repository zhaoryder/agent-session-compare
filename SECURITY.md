# Security policy

## Supported versions

Security fixes are applied to the latest release.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository. Do not attach a real Codex or Claude Code session log to a public issue.

Useful reports include a minimal synthetic JSONL example, the generated redacted output, the affected version, and the expected behavior.

## Data handling

The CLI is local-only and has no telemetry. It intentionally excludes conversation and tool payload text from reports. Original session files remain sensitive and are never safe to publish by default.
