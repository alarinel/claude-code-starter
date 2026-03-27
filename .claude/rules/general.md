# General Coding Standards

## Naming
- Descriptive names. Abbreviations only when universally understood (id, url, http).
- Booleans: `is`, `has`, `can`, `should`, `was` prefix.
- Constants: UPPER_SNAKE_CASE. Everything else follows language convention.
- File names match the primary export or class.

## Structure
- One concept per file.
- Functions under 40 lines. Extract helpers when longer.
- Maximum 3 levels of nesting. Flatten with early returns.
- Group imports: stdlib, external deps, internal modules (blank line between groups).

## Error Handling
- Never swallow exceptions silently. Log at minimum.
- Use specific exception types over generic ones.
- Fail fast: validate inputs at function entry.
- Return meaningful error messages.

## Security
- Never log secrets, tokens, passwords, or PII.
- Parameterize all database queries.
- Validate and sanitize all external input at system boundaries.
