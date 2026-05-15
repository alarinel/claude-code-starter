# Stack Adaptation Guide

How to adapt claude-code-starter for different technology stacks. The kit is database-agnostic, language-agnostic, and framework-agnostic by design — this guide shows you exactly what to change for each variation.

---

## Database Adaptation

### MySQL to PostgreSQL

The MCP server uses Knex, which abstracts the database driver. Switching from MySQL to PostgreSQL requires three changes:

**1. Install the PostgreSQL driver:**

```bash
cd mcp-server
npm uninstall mysql2
npm install pg
```

**2. Change the environment variable:**

```bash
# .env or settings.json env block
DB_CLIENT=pg
DB_PORT=5432
```

That is it for basic queries. Knex normalizes the query builder across drivers.

**3. Update raw SQL for dialect differences:**

If your tools use raw SQL (via `executeQuery()`), some syntax differs:

| MySQL | PostgreSQL | Notes |
|-------|------------|-------|
| `` `backtick_quotes` `` | `"double_quotes"` | Knex handles this automatically for the query builder |
| `LIMIT ?, ?` | `LIMIT $1 OFFSET $2` | Knex `raw()` uses `?` for both — it translates internally |
| `AUTO_INCREMENT` | `SERIAL` or `GENERATED ALWAYS AS IDENTITY` | DDL only |
| `SHOW TABLES` | `SELECT tablename FROM pg_tables WHERE schemaname = 'public'` | Information schema queries differ |
| `DESCRIBE table` | `SELECT * FROM information_schema.columns WHERE table_name = 'table'` | |
| `IF NOT EXISTS` (DDL) | Same syntax | Works in both |
| `INSERT IGNORE` | `INSERT ... ON CONFLICT DO NOTHING` | |
| `REPLACE INTO` | `INSERT ... ON CONFLICT DO UPDATE` (upsert) | |

The `executeQuery` result normalization in `database.ts` already handles the different return shapes:
- MySQL returns `[rows, fields]`
- PostgreSQL returns `{ rows, rowCount }`

### MySQL to SQLite

SQLite is ideal for local development and simple projects that do not need a database server.

**1. Install the SQLite driver:**

```bash
cd mcp-server
npm uninstall mysql2
npm install better-sqlite3
```

**2. Change the environment variables:**

```bash
DB_CLIENT=better-sqlite3
DB_NAME=./data/app.db    # File path instead of database name
```

**3. Update the database config:**

SQLite does not use host, port, user, or password. Modify the Knex config:

```typescript
// In database.ts loadConfig()
if (cfg.client === 'better-sqlite3') {
  return knex({
    client: 'better-sqlite3',
    connection: {
      filename: cfg.database,  // e.g., './data/app.db'
    },
    useNullAsDefault: true,    // SQLite requires this
  });
}
```

**4. SQLite-specific limitations:**

| Feature | MySQL/PostgreSQL | SQLite |
|---------|-----------------|--------|
| Concurrent writes | Full support | Single-writer (WAL mode helps) |
| ALTER TABLE | Full support | Limited (no DROP COLUMN before 3.35) |
| JSON functions | Native | Available in SQLite 3.38+ |
| Full-text search | Plugins needed | Built-in FTS5 |
| Connection pooling | Essential | Not needed (in-process) |

SQLite is a great choice for:
- Local development without a database server
- CI/CD test environments
- Single-user deployments
- Dashboard data (the kit's dashboard already uses SQLite)

### Database-Free Mode

For projects that do not need database access at all, you can skip the MCP server entirely. The minimal setup works with just CLAUDE.md, hooks, skills, and agents — no database required.

If you want the MCP server but without a database, remove the database service:
1. Delete `mcp-server/src/services/database.ts`
2. Remove `knex` and database drivers from `package.json`
3. Remove the database health check from `health.ts`
4. Remove any tools that depend on `executeQuery`

---

## Cache Adaptation

### Redis to File-Based State

If you do not want to run Redis, replace Redis-backed state with file-based equivalents.

**Session state (hooks):**

The file-based hooks already write to local files. No change needed — they write to `temp/{session_id}/logs/`.

**MCP server session tracking:**

Replace Redis pub/sub with file watching or polling:

```typescript
// Instead of:
await redis.set(`session:${id}:status`, 'active');
await redis.publish('session:update', JSON.stringify({ id, status: 'active' }));

// Use file-based state:
import { writeFileSync, readFileSync } from 'node:fs';

const stateDir = `./temp/state`;
writeFileSync(`${stateDir}/session-${id}.json`, JSON.stringify({ status: 'active' }));
```

**Queue management:**

Replace Redis lists with a SQLite table or JSON file:

```typescript
// Instead of:
await redis.lpush('queue:pending', JSON.stringify(task));
const task = await redis.rpop('queue:pending');

// Use SQLite:
await db('queue').insert({ task: JSON.stringify(task), status: 'pending' });
const next = await db('queue').where('status', 'pending').orderBy('id').first();
```

**Trade-offs:**

| Capability | Redis | File-Based |
|-----------|-------|------------|
| Real-time pub/sub | Native | Not supported (poll instead) |
| Atomic operations | Native | Requires file locks |
| Cross-process coordination | Native | Limited |
| TTL/expiration | Native | Manual cleanup |
| Performance | ~1ms reads | ~5-10ms reads |
| Setup complexity | Requires Redis server | Zero dependencies |

---

## Backend Language Adaptation

The kit's CLAUDE.md and skills reference generic concepts (build, test, deploy) that work with any backend. Here is how to customize for specific languages.

### Java (Spring Boot, Maven/Gradle)

**CLAUDE.md build commands:**
```markdown
| Type | Command | Success |
|------|---------|---------|
| Backend | `./mvnw compile -q` | exit 0 |
| Tests | `./mvnw test -pl module-name` | exit 0 |
```

**settings.json permissions:**
```json
{
  "permissions": {
    "allow": [
      "Bash(./mvnw*)",
      "Bash(./gradlew*)",
      "Bash(java*)",
      "Bash(mvn*)"
    ]
  }
}
```

**Developer skill additions:**
```markdown
## Java-Specific Rules

- Use `@Override` on every overridden method.
- Prefer constructor injection over field injection for Spring beans.
- Follow your team's ORM conventions (JPA annotations, MyBatis XML, etc.) consistently.
- Run `./mvnw compile -q` after every change — do not trust IDE auto-build alone.
```

**Rules file — create `.claude/rules/java.md`:**
```markdown
# Java Coding Standards

- Follow Google Java Style Guide for formatting.
- All public methods have Javadoc.
- Use Optional instead of null for return types that may be absent.
- Streams over loops for collection transformations.
- Records for immutable data classes (Java 16+).
```

### Python (FastAPI, Django, Flask)

**CLAUDE.md build commands:**
```markdown
| Type | Command | Success |
|------|---------|---------|
| Type check | `mypy src/` | exit 0 |
| Tests | `pytest tests/ -q` | exit 0 |
| Lint | `ruff check src/` | exit 0 |
```

**settings.json permissions:**
```json
{
  "permissions": {
    "allow": [
      "Bash(python*)",
      "Bash(pip*)",
      "Bash(pytest*)",
      "Bash(mypy*)",
      "Bash(ruff*)",
      "Bash(uv*)"
    ]
  }
}
```

**Rules file — create `.claude/rules/python.md`:**
```markdown
# Python Coding Standards

- Type hints on all function signatures.
- Use `pathlib.Path` instead of `os.path`.
- Async functions for I/O-bound operations.
- Pydantic models for data validation.
- f-strings over .format() or % formatting.
- Never use bare `except:`. Always catch specific exceptions.
```

### Go

**CLAUDE.md build commands:**
```markdown
| Type | Command | Success |
|------|---------|---------|
| Build | `go build ./...` | exit 0 |
| Tests | `go test ./... -count=1` | exit 0 |
| Vet | `go vet ./...` | exit 0 |
```

**settings.json permissions:**
```json
{
  "permissions": {
    "allow": [
      "Bash(go build*)",
      "Bash(go test*)",
      "Bash(go vet*)",
      "Bash(go mod*)",
      "Bash(go run*)"
    ]
  }
}
```

**Rules file — create `.claude/rules/go.md`:**
```markdown
# Go Coding Standards

- Accept interfaces, return structs.
- Errors are values, not exceptions. Check every error.
- Table-driven tests for functions with multiple cases.
- Context as first parameter for functions that do I/O.
- No init() functions. Prefer explicit initialization.
- `go fmt` before every commit.
```

### Rust

**CLAUDE.md build commands:**
```markdown
| Type | Command | Success |
|------|---------|---------|
| Build | `cargo check` | exit 0 |
| Tests | `cargo test` | exit 0 |
| Clippy | `cargo clippy -- -D warnings` | exit 0 |
```

**settings.json permissions:**
```json
{
  "permissions": {
    "allow": [
      "Bash(cargo*)",
      "Bash(rustc*)"
    ]
  }
}
```

---

## Frontend Framework Adaptation

### React Dashboard to Vue

The kit's dashboard frontend is React + Vite. To switch to Vue:

**1. Replace dependencies in `dashboard/frontend/package.json`:**

```json
{
  "dependencies": {
    "vue": "^3.5.0",
    "vue-router": "^4.4.0",
    "pinia": "^2.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.0",
    "typescript": "^5.8.0",
    "vite": "^6.0.0"
  }
}
```

**2. Update `vite.config.ts`:**

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
});
```

**3. Update `.claude/rules/frontend.md`:**

Replace React-specific guidance with Vue conventions:
- `<script setup>` instead of JSX
- Composition API over Options API
- Pinia stores instead of React Context/Redux
- `v-if`/`v-for` instead of conditional JSX

**What stays the same:**
- The dashboard backend (Express + SQLite) is framework-agnostic
- The API contract does not change
- Vite configuration patterns are similar
- Tailwind CSS works identically

### React Dashboard to Svelte

Similar to Vue, replace the frontend framework:

```json
{
  "dependencies": {
    "svelte": "^5.0.0"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "vite": "^6.0.0"
  }
}
```

The backend API and overall architecture remain unchanged.

---

## MCP Server Language Adaptation

The kit's MCP server is TypeScript/Node.js. The MCP protocol is language-agnostic — you can build an MCP server in any language that can read stdin and write to stdout.

### Python MCP Server

Use the official Python MCP SDK:

```bash
pip install mcp
```

```python
# mcp_server/main.py
from mcp.server import Server
from mcp.server.stdio import stdio_server

app = Server("my-project")

@app.tool()
async def health():
    """Check service health."""
    return {"status": "healthy"}

@app.tool()
async def run_query(sql: str, params: list = None):
    """Execute a database query."""
    # Your database logic here
    pass

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

**Claude Code config:**
```json
{
  "mcpServers": {
    "my-project": {
      "command": "python",
      "args": ["mcp_server/main.py"]
    }
  }
}
```

### Go MCP Server

Use a Go MCP library (community or custom):

```go
// main.go
package main

import (
    "encoding/json"
    "os"
)

func main() {
    // Read JSON-RPC from stdin, write to stdout
    // Implement the MCP protocol handlers
}
```

The key requirement is that your server:
1. Reads JSON-RPC messages from stdin
2. Writes JSON-RPC responses to stdout
3. Logs to stderr (not stdout)
4. Registers tools with name, description, and parameter schemas
5. Handles the MCP handshake at startup

---

## Summary: What to Change Per Stack

| Component | What Changes | What Stays |
|-----------|-------------|------------|
| Database driver | `DB_CLIENT` env var, npm package | Knex query interface, `executeQuery()` API |
| Cache backend | Redis package → file I/O or SQLite | State management patterns, hook architecture |
| Backend language | Build commands, lint rules, `.claude/rules/` | CLAUDE.md structure, skill format, hook system |
| Frontend framework | Dependencies, Vite plugin, component syntax | API contract, backend, build pipeline |
| MCP server language | Entire implementation | Protocol, tool schemas, Claude Code config |

The most common adaptation is changing the database driver (one env var) or adding language-specific rules (one markdown file). The kit's architecture is designed so that most customizations are isolated — changing one component does not cascade into others.
