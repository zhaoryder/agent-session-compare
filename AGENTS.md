# Repository guidance

## Product boundaries

- Keep the CLI local-only and deterministic. Do not add telemetry, uploads, or model calls.
- Never include prompt, response, reasoning, tool input, or tool output text in a report.
- Treat absolute paths and fixture content as potentially sensitive.
- Do not rank a provider or declare a subjective winner.

## Engineering

- Support Node.js 20 and newer.
- Keep the normalized JSON schema stable within a major version.
- Add a sanitized fixture or inline JSONL test for every parser behavior change.
- Run `npm run check`, `npm test`, and `npm run build` before committing.
