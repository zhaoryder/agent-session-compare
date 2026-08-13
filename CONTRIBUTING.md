# Contributing

Thanks for helping make coding-agent comparisons more useful and less anecdotal.

## Before opening a pull request

1. Open an issue for a new provider or a schema-level change.
2. Remove prompts, responses, source code, usernames, repository names, session IDs, and absolute paths from fixtures.
3. Add focused tests for the records your change handles.
4. Run:

   ```bash
   npm run check
   npm test
   npm run build
   ```

Parser changes should be tolerant of unknown records and conservative about metrics. Missing data is better than a confident but incorrect number.

## Pull request scope

Keep pull requests small. Avoid drive-by formatting changes, generated reports, dependency swaps, or unrelated refactors. Explain how you verified privacy behavior when touching report generation or path handling.
