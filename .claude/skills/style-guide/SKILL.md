---
name: style-guide
description: Writing standards for documentation, comments, commits, and communication
category: foundation
tools: [Read, Edit]
---

# Style Guide

## Purpose

Defines writing standards for everything that isn't source code: documentation, code comments, commit messages, PR descriptions, and user-facing text. Consistent writing makes a project easier to navigate and maintain. Load this skill whenever writing prose in the project.

## Prerequisites

- None. This skill is self-contained.

## Standards

### Documentation

**Tone:** Direct, practical, second-person ("you"). Write like you're explaining to a competent colleague, not a beginner and not a PhD committee.

**Structure:**
- Lead with purpose. First sentence answers "what is this and why should I care?"
- Use headings for scanability. No wall-of-text paragraphs.
- Code examples over prose explanations. Show, don't tell.
- Tables for structured comparisons. Don't use bullet lists for tabular data.

**Rules:**
- No filler phrases: "It should be noted that", "In order to", "As a matter of fact"
- No hedge words in technical docs: "perhaps", "maybe", "it seems like"
- No emojis in technical documentation
- One idea per paragraph
- Active voice: "The function returns an error" not "An error is returned by the function"

### Code Comments

**When to comment:**
- WHY, not WHAT. The code shows what it does. Comments explain why it does it that way.
- Non-obvious business rules: `// Tax-exempt for orders under $5 per state regulation 12.3`
- Workarounds: `// Using setTimeout because the API doesn't support webhooks yet`
- Performance decisions: `// Pre-allocating array — this loop runs 10M+ times in production`

**When NOT to comment:**
- Obvious code: `i++ // increment i` adds nothing
- Commented-out code: delete it; git remembers
- TODOs without context: `// TODO: fix this` is useless. `// TODO(#1234): handle rate limit retry` is acceptable.

### Commit Messages

Follow Conventional Commits (detailed in `/code-checkin` skill):

```
type(scope): imperative description under 72 chars

Optional body explaining WHY the change was made, not what changed
(the diff shows what changed). Wrap at 80 characters.

Refs: #1234
```

### Error Messages

User-facing error messages must:
- Say what went wrong in plain language
- Suggest what the user can do about it
- Include an error code or reference for support

```
Bad:  "Error: ECONNREFUSED"
Good: "Could not connect to the database. Check that the database server is running and the connection string in .env is correct. (Error: ECONNREFUSED)"
```

### README and Project Docs

- Start with a one-paragraph summary
- Include: quick start, prerequisites, configuration, usage examples
- Don't document internal implementation details in the README
- Keep it current — outdated docs are worse than no docs

## Examples

**Good documentation paragraph:**
> The cache invalidation runs every 5 minutes. It scans for entries older than the TTL and removes them in batches of 100 to avoid blocking the event loop. If you need immediate invalidation, call `cache.flush(key)` directly.

**Good code comment:**
```javascript
// The API returns timestamps in PT timezone regardless of the Accept-Timezone
// header. We convert to UTC here to normalize across data sources.
const utcTime = convertPTtoUTC(response.timestamp);
```

**Good commit message:**
```
fix(payments): retry failed webhook deliveries up to 3 times

Stripe webhooks were being silently dropped when our endpoint returned
a transient 503. Now we queue failed deliveries and retry with
exponential backoff (1s, 5s, 25s).

Refs: #892
```

## Gotchas

- **Don't write docs for code that will change next week.** Document stable interfaces, not work in progress.
- **Screenshots in docs go stale fast.** Prefer text descriptions of UI flows. If you must use screenshots, note the version/date.
- **Markdown rendering varies by platform.** Test that your tables, code blocks, and links render correctly on the platform where the docs will be read (GitHub, GitLab, npm, etc.).
- **Don't duplicate information.** Link to the canonical source instead of copying. Copied docs drift out of sync.
