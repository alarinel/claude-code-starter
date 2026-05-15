# Adding a Custom MCP Tool

See `docs/mcp-server-guide.md` Chapter 5 for a complete walkthrough.

## Example: Codebase Search Tool

This directory contains a complete MCP tool that searches the codebase using ripgrep and returns structured results.

**Files:**
- `search-codebase.ts` — Full tool implementation with parameter validation, error handling, and structured response

## How to Use

1. Copy `search-codebase.ts` to `mcp-server/src/tools/search-codebase.ts`
2. Register in `mcp-server/src/index.ts`:

```typescript
import { searchCodebaseTool } from './tools/search-codebase.js';

server.tool(
  searchCodebaseTool.name,
  searchCodebaseTool.schema,
  searchCodebaseTool.handler
);
```

3. Rebuild: `npm run build`

## Tool Design Principles

- **One tool, one purpose.** Don't create a "do everything" tool.
- **Validate parameters first.** Use zod schemas for type-safe validation.
- **Return structured data.** Objects and arrays, not raw strings.
- **Include error context.** Error code + message + suggested fix.
- **Timeout external calls.** Default: 10s for HTTP, 30s for DB, 5s for cache.
- **Idempotent when possible.** Running twice should be safe.

## Parameter Schema Pattern

```typescript
const MyToolParams = z.object({
  required_param: z.string().min(1).describe('What this param does'),
  optional_param: z.number().default(10).describe('With a default'),
  enum_param: z.enum(['a', 'b', 'c']).optional().describe('Limited choices'),
});
```

Required params first, optional params with defaults, all with `.describe()`.
