# General Coding Standards

These rules apply to all languages and all files in this project.

## Naming

- Use descriptive names. Abbreviations are acceptable only when universally understood (e.g., `id`, `url`, `http`).
- Boolean variables and functions start with `is`, `has`, `can`, `should`, or `was`.
- Constants use UPPER_SNAKE_CASE. Everything else follows the language convention.
- File names match the primary export or class they contain.

## Structure

- One concept per file. If a file has multiple unrelated responsibilities, split it.
- Keep functions under 40 lines. If longer, extract a helper.
- Maximum 3 levels of nesting. Flatten with early returns or guard clauses.
- Group imports: stdlib first, then external dependencies, then internal modules. Separate each group with a blank line.

## Error Handling

- Never swallow exceptions silently. Log at minimum; prefer structured error responses.
- Use specific exception types over generic ones.
- Fail fast: validate inputs at function entry, not deep in the call chain.
- Return meaningful error messages. "Something went wrong" is never acceptable.

## Documentation

- Public APIs get doc comments explaining purpose, parameters, return values, and thrown exceptions.
- Do not comment obvious code. Comments explain WHY, not WHAT.
- Keep TODOs actionable: `TODO(username): description -- tracked in #issue`.
- Delete commented-out code. Version control exists for a reason.

## Testing

- Every public function has at least one test.
- Tests are independent and idempotent. No shared mutable state between tests.
- Test names describe the scenario: `shouldReturnEmptyListWhenNoResultsFound`.
- Prefer real assertions over snapshot tests for logic.

## Security

- Never log secrets, tokens, passwords, or PII.
- Parameterize all database queries. No string concatenation for SQL.
- Validate and sanitize all external input at system boundaries.
- Use environment variables for secrets. Never hardcode them.

## Performance

- Do not optimize without measuring. Profile first, then fix the bottleneck.
- Avoid N+1 queries. Batch database calls when iterating over collections.
- Use pagination for any endpoint that returns unbounded lists.
- Cache expensive computations, but always have an invalidation strategy.
