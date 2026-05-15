# MCP Server Development Guide

How to build, extend, and maintain a Model Context Protocol (MCP) server for Claude Code. This guide covers the architecture of the kit's included MCP server, how to add your own tools, and patterns for reliability and security.

**Audience:** Users building custom MCP tools.

---

## Table of Contents

1. [MCP Fundamentals](#chapter-1-mcp-fundamentals)
2. [Server Architecture](#chapter-2-server-architecture)
3. [Building Services](#chapter-3-building-services)
4. [Building Tools](#chapter-4-building-tools)
5. [Adding Custom Tools](#chapter-5-adding-custom-tools)
6. [Advanced Patterns](#chapter-6-advanced-patterns)

---

## Chapter 1: MCP Fundamentals

### What MCP Is

The Model Context Protocol (MCP) is a standard for connecting AI assistants to external tools and data sources. Instead of Claude being limited to reading files and running shell commands, MCP lets Claude call structured tools that access databases, APIs, caches, and any other service you define.

**Without MCP:**
```
Claude → Read file → Parse data manually → Bash("curl ...") → Parse response manually
```

**With MCP:**
```
Claude → context({ sql: "SELECT * FROM users LIMIT 5" }) → Structured result
```

MCP tools are:
- **Typed** — parameters have schemas (string, number, enum, etc.)
- **Documented** — each tool has a description Claude reads
- **Validated** — input is checked before execution
- **Error-handled** — failures return structured error messages

### How Claude Code Uses MCP

Claude Code connects to MCP servers via **stdio transport**. This means:

1. Claude Code starts your MCP server as a child process
2. Communication happens over stdin/stdout using JSON-RPC
3. The server registers tools at startup
4. Claude calls tools by name with typed parameters
5. The server executes the tool and returns results
6. The server stays running until the session ends

```
┌─────────────┐    stdin (JSON-RPC)    ┌─────────────┐
│ Claude Code  │──────────────────────→│  MCP Server  │
│    CLI       │←──────────────────────│  (Node.js)   │
└─────────────┘    stdout (JSON-RPC)   └─────────────┘
```

The stdio transport is simple and reliable. No HTTP server, no ports to manage, no CORS headers.

### MCP Server Configuration

Claude Code discovers MCP servers through its configuration. In your project's `.claude/settings.json` (or the user-level Claude Code config), add:

```json
{
  "mcpServers": {
    "my-project": {
      "command": "node",
      "args": ["mcp-server/dist/index.js"],
      "env": {
        "DB_HOST": "localhost",
        "DB_PORT": "3306",
        "REDIS_HOST": "localhost"
      }
    }
  }
}
```

| Field | Purpose |
|-------|---------|
| `command` | The executable to run (`node`, `npx`, `python`, etc.) |
| `args` | Arguments passed to the command |
| `env` | Environment variables the server needs |

### Tool Registration and Parameter Schemas

Each tool is registered with:
- **Name** — unique identifier (snake_case by convention)
- **Description** — what the tool does (Claude reads this to decide when to use it)
- **Parameters** — Zod schemas defining input types and validation
- **Handler** — async function that executes the tool

```typescript
server.tool(
  'get_user',                              // Name
  'Fetch a user by ID',                    // Description
  {                                        // Parameters (Zod schemas)
    user_id: z.number().describe('The user ID to look up'),
  },
  async ({ user_id }) => {                 // Handler
    const user = await db.query('SELECT * FROM users WHERE id = ?', [user_id]);
    return {
      content: [{ type: 'text', text: JSON.stringify(user) }],
    };
  },
);
```

Claude sees the tool name, description, and parameter schemas. It uses these to decide when and how to call the tool.

---

## Chapter 2: Server Architecture

### Entry Point Structure

The kit's MCP server entry point follows a clean initialization pattern:

```typescript
// src/index.ts

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { logger } from './services/logger.js';

// 1. Create the MCP server instance
const server = new McpServer({
  name: 'my-project',
  version: '1.0.0',
});

// 2. Register all tools
import { registerHealthTool } from './tools/health.js';
import { registerSessionTool } from './tools/session.js';

registerHealthTool(server);
registerSessionTool(server);

// 3. Set up transport and connect
const transport = new StdioServerTransport();

// 4. Handle clean shutdown
process.on('SIGINT', async () => {
  logger.info('shutting down (SIGINT)');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('shutting down (SIGTERM)');
  await cleanup();
  process.exit(0);
});

async function cleanup() {
  // Destroy database connections, Redis, circuit breakers
  const { destroyDatabase } = await import('./services/database.js');
  const { destroyRedis } = await import('./services/redis.js');
  const { destroyAllCircuitBreakers } = await import('./services/circuit-breaker.js');

  destroyAllCircuitBreakers();
  await destroyDatabase();
  await destroyRedis();
}

// 5. Start the server
await server.connect(transport);
logger.info('MCP server started');
```

**Key design decisions:**

1. **Tools register at startup.** Claude discovers available tools during the MCP handshake. Tools cannot be added or removed after startup.
2. **Shutdown is clean.** The server handles SIGINT/SIGTERM gracefully, closing database connections and Redis before exiting.
3. **Logging goes to stderr.** Since stdout is the MCP transport (JSON-RPC), all logs must go to stderr. Pino logs to stderr by default.

### Lazy Service Initialization

Services (database, Redis) are initialized lazily — on first use, not at server startup. This has several benefits:

```typescript
// src/services/database.ts

let instance: Knex | null = null;

export function getDatabase(): Knex {
  if (instance) return instance;  // Return existing connection

  // First call: create and configure the connection
  const cfg = loadConfig();
  instance = knex({ client: cfg.client, connection: { ... }, pool: { ... } });
  return instance;
}
```

**Why lazy initialization:**

1. **Faster startup.** The server starts immediately. Database/Redis connections happen when the first tool that needs them is called.
2. **Graceful degradation.** If Redis is down, tools that do not need Redis still work.
3. **Simpler testing.** You can test individual tools without standing up all dependencies.

### Clean Shutdown Handling

MCP servers run as long as the Claude Code session. When the session ends, Claude Code sends SIGTERM. Your server must:

1. **Stop accepting new tool calls** (the SDK handles this)
2. **Finish in-flight operations** (with a reasonable timeout)
3. **Close connection pools** (database, Redis)
4. **Shut down circuit breakers** (clear timers)
5. **Exit cleanly** (exit code 0)

```typescript
async function cleanup() {
  // Order matters: shut down circuit breakers first (they reference services),
  // then services themselves.
  destroyAllCircuitBreakers();
  await destroyRedis();
  await destroyDatabase();
}
```

Never call `process.exit()` without cleanup. Abandoned database connections accumulate and eventually exhaust the connection pool.

---

## Chapter 3: Building Services

### Database Service (Knex Patterns)

The kit uses [Knex](https://knexjs.org/) as the database layer. Knex provides:
- A query builder (type-safe, composable)
- Raw SQL support (for complex queries)
- Connection pooling (reuse connections across requests)
- Multi-driver support (MySQL, PostgreSQL, SQLite, MSSQL)

#### Configuration

Database configuration comes from environment variables with sensible defaults:

```typescript
interface DatabaseConfig {
  client: string;     // 'mysql2', 'pg', 'better-sqlite3'
  host: string;       // '127.0.0.1'
  port: number;       // 3306, 5432
  user: string;       // 'root'
  password: string;   // from env, never hardcoded
  database: string;   // 'app'
  poolMin: number;    // 2
  poolMax: number;    // 10
}

function loadConfig(): DatabaseConfig {
  return {
    client: process.env['DB_CLIENT'] ?? 'mysql2',
    host: process.env['DB_HOST'] ?? '127.0.0.1',
    port: parseInt(process.env['DB_PORT'] ?? '3306', 10),
    user: process.env['DB_USER'] ?? 'root',
    password: process.env['DB_PASSWORD'] ?? '',
    database: process.env['DB_NAME'] ?? 'app',
    poolMin: parseInt(process.env['DB_POOL_MIN'] ?? '2', 10),
    poolMax: parseInt(process.env['DB_POOL_MAX'] ?? '10', 10),
  };
}
```

#### Executing Queries

The `executeQuery` function normalizes results across drivers:

```typescript
export async function executeQuery(
  sql: string,
  params: unknown[] = [],
  schema?: string,
): Promise<{ rows: unknown[]; rowCount: number }> {
  const db = getDatabase();
  const target = schema ? db.withSchema(schema) : db;
  const result = await target.raw(sql, params);

  // Normalize: mysql2 returns [rows, fields], pg returns { rows, rowCount }
  let rows: unknown[];
  let rowCount: number;

  if (Array.isArray(result)) {
    rows = Array.isArray(result[0]) ? result[0] : [result[0]];
    rowCount = rows.length;
  } else if (result && typeof result === 'object' && 'rows' in result) {
    rows = (result as { rows: unknown[]; rowCount: number }).rows;
    rowCount = (result as { rows: unknown[]; rowCount: number }).rowCount;
  } else {
    rows = Array.isArray(result) ? result : [];
    rowCount = rows.length;
  }

  return { rows, rowCount };
}
```

**Critical:** Always use parameterized queries (`?` placeholders with a params array). Never concatenate user input into SQL strings.

```typescript
// CORRECT: parameterized
await executeQuery('SELECT * FROM users WHERE id = ?', [userId]);

// WRONG: SQL injection vulnerability
await executeQuery(`SELECT * FROM users WHERE id = ${userId}`);
```

#### Health Check

The database health check verifies connectivity with a simple query:

```typescript
export async function isDatabaseHealthy(): Promise<boolean> {
  if (!instance) return false;
  try {
    await instance.raw('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
```

### Redis Service

The kit uses [ioredis](https://github.com/redis/ioredis) for Redis connectivity.

#### Configuration

```typescript
const redis = new Redis({
  host: process.env['REDIS_HOST'] ?? '127.0.0.1',
  port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
  password: process.env['REDIS_PASSWORD'] || undefined,
  db: parseInt(process.env['REDIS_DB'] ?? '0', 10),
  enableOfflineQueue: false,      // Fail immediately when disconnected
  maxRetriesPerRequest: 3,        // Retry failed commands 3 times
  lazyConnect: true,              // Do not connect until first command
  retryStrategy(times) {
    return Math.min(times * 200, 5000);  // Exponential backoff, max 5s
  },
});
```

**Key settings explained:**

| Setting | Value | Why |
|---------|-------|-----|
| `enableOfflineQueue: false` | Commands fail immediately when disconnected | Prevents silent queuing that masks connection issues |
| `maxRetriesPerRequest: 3` | Retry each command up to 3 times | Handles transient network blips |
| `lazyConnect: true` | Connect on first command, not at creation | Faster startup, no error if Redis is not needed |
| `retryStrategy` | Exponential backoff, max 5s | Avoids hammering a recovering Redis |

#### Event Logging

Redis lifecycle events are logged for debugging:

```typescript
redis.on('connect', () => log.info('redis connected'));
redis.on('ready', () => log.info('redis ready'));
redis.on('error', (err) => log.error({ err }, 'redis error'));
redis.on('close', () => log.warn('redis connection closed'));
```

### Circuit Breaker Pattern

The kit uses [opossum](https://nodeshift.dev/opossum/) for circuit breakers. A circuit breaker protects your server from cascading failures when external services are down.

#### How It Works

```
Normal operation (CLOSED):
  Requests flow through normally.
  Failures are counted.

Too many failures (OPEN):
  Requests are rejected immediately without calling the service.
  After a timeout, the circuit enters HALF-OPEN.

Probing (HALF-OPEN):
  One request is allowed through.
  If it succeeds → CLOSED (normal operation resumes).
  If it fails → OPEN (back to rejecting).
```

#### Creating a Circuit Breaker

```typescript
import { createCircuitBreaker } from './services/circuit-breaker.js';

// Protect an external API call
const weatherBreaker = createCircuitBreaker(
  'weather-api',                    // Unique name
  async (city: string) => {         // The function to protect
    const res = await fetch(`https://api.weather.com/v1/${city}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  {
    errorThresholdPercentage: 50,   // Open after 50% failures
    resetTimeout: 30_000,           // Try again after 30 seconds
    timeout: 10_000,                // Each request times out after 10s
    volumeThreshold: 5,             // Need at least 5 requests before tripping
  },
);

// Use it
try {
  const weather = await weatherBreaker.fire('new-york');
} catch (err) {
  // Either the call failed or the circuit is open
}
```

#### Singleton Registry

The kit uses a registry pattern so each logical service gets exactly one circuit breaker:

```typescript
const registry = new Map<string, CircuitBreaker>();

export function createCircuitBreaker(name, fn, options) {
  const existing = registry.get(name);
  if (existing) return existing;       // Return existing, do not create duplicate

  const breaker = new CircuitBreaker(fn, options);
  registry.set(name, breaker);
  return breaker;
}
```

This prevents a common bug: accidentally creating multiple breakers for the same service, each with independent failure counts.

### Health Check Aggregation

The health service collects status from all backend services into a single report:

```typescript
const report = await getHealthReport();
// Returns:
{
  status: 'healthy' | 'degraded' | 'unhealthy',
  services: [
    { name: 'database', status: 'healthy', latency_ms: 2 },
    { name: 'redis', status: 'healthy', latency_ms: 1 },
    { name: 'weather-api', status: 'unhealthy', latency_ms: 5001, error: 'timeout' },
  ],
  checked_at: '2025-01-15T10:30:00.000Z',
  total_latency_ms: 5003,
}
```

**Status logic:**
- All services healthy → `healthy`
- Some services unhealthy → `degraded`
- All services unhealthy → `unhealthy`

#### Adding Custom Health Checks

```typescript
import { registerHealthCheck } from './services/health.js';

// Register at startup
registerHealthCheck('external-api', async () => {
  const res = await fetch('https://api.example.com/health', {
    signal: AbortSignal.timeout(5000),
  });
  return res.ok;
});
```

Custom checks are included in every health report alongside the built-in database and Redis checks.

### Structured Logging with Pino

The kit uses [Pino](https://getpino.io/) for structured JSON logging.

#### Why Pino

- **Fast** — Pino is one of the fastest Node.js loggers
- **Structured** — JSON output, not plain text (machine-parseable)
- **Context-aware** — Automatic correlation IDs via AsyncLocalStorage
- **Leveled** — info, warn, error, debug with runtime level configuration

#### Log Output

```json
{"level":"info","time":"2025-01-15T10:30:00.000Z","service":"database","correlation_id":"abc-123","msg":"connected"}
{"level":"warn","time":"2025-01-15T10:30:01.000Z","service":"redis","correlation_id":"abc-123","msg":"redis reconnecting","attempt":1,"delay_ms":200}
```

#### Child Loggers

Each service creates a child logger with the service name:

```typescript
import { createChildLogger } from './services/logger.js';

const log = createChildLogger('my-service');

log.info('starting up');
// → {"level":"info","service":"my-service","msg":"starting up"}

log.error({ err, userId: 123 }, 'operation failed');
// → {"level":"error","service":"my-service","err":{...},"userId":123,"msg":"operation failed"}
```

#### Log Levels

| Level | When to Use |
|-------|-------------|
| `debug` | Development-only detail (parameter values, cache hits) |
| `info` | Business events (tool invoked, query executed, session started) |
| `warn` | Recoverable issues (Redis reconnecting, slow query, circuit half-open) |
| `error` | Failures (tool handler threw, connection lost, timeout) |
| `fatal` | Server cannot continue (config missing, port in use) |

Set the level via environment variable:
```bash
LOG_LEVEL=debug node mcp-server/dist/index.js
```

---

## Chapter 4: Building Tools

### Tool Anatomy

Every MCP tool has four parts:

```typescript
server.tool(
  // 1. NAME: unique identifier, snake_case
  'run_query',

  // 2. DESCRIPTION: what it does (Claude reads this)
  'Execute a SQL query against the database. Returns rows as JSON.',

  // 3. PARAMETERS: Zod schemas with descriptions
  {
    sql: z.string().describe('SQL query to execute (use ? for parameters)'),
    params: z.array(z.unknown()).optional().describe('Bind parameters for ? placeholders'),
    schema: z.string().optional().describe('Database schema to query against'),
  },

  // 4. HANDLER: async function that executes the tool
  async ({ sql, params, schema }) => {
    const result = await executeQuery(sql, params ?? [], schema);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ rows: result.rows, rowCount: result.rowCount }, null, 2),
      }],
    };
  },
);
```

### Tool Naming Conventions

| Convention | Example | Rationale |
|------------|---------|-----------|
| `verb_noun` | `get_user`, `run_query` | Clear action + target |
| `snake_case` | `list_sessions` | Standard for MCP tools |
| No abbreviations | `get_configuration` not `get_cfg` | Clarity for Claude |
| Namespace related tools | `db_query`, `db_status` | Grouping by domain |

### Input Validation

Zod handles type validation automatically. For additional business logic validation, check inside the handler:

```typescript
async ({ user_id, email }) => {
  // Type validation is automatic (Zod).
  // Business validation is manual:
  if (user_id <= 0) {
    return error('user_id must be a positive integer');
  }

  if (email && !email.includes('@')) {
    return error('email must contain an @ symbol');
  }

  // ... proceed with validated input
}
```

**Validation order:**
1. Zod validates types (string, number, enum, optional) — automatic
2. Your handler validates business rules (ranges, formats, relationships)
3. Your service validates database constraints (unique, foreign key)

### Error Handling Patterns

Every tool handler must be wrapped in a try/catch. Unhandled exceptions crash the MCP server and terminate the Claude Code session.

```typescript
async (args) => {
  try {
    // Tool logic here
    const result = await doWork(args);
    return ok(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ err, args }, 'tool failed');
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
      isError: true,
    };
  }
}
```

**Error response structure:**

```json
{
  "error": "QUERY_FAILED",
  "message": "Column 'email' does not exist in table 'users'",
  "suggestion": "Check available columns with: DESCRIBE users"
}
```

Give Claude enough information to self-correct. "Query failed" is useless. "Column 'email' does not exist" tells Claude exactly what to fix.

### Response Helpers

The kit uses two helper functions for consistent responses:

```typescript
function ok(data: unknown) {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

function error(message: string) {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}
```

**When to use `isError: true`:**
- The tool could not complete its intended operation
- The input was invalid
- An external service is unavailable

**When NOT to use `isError: true`:**
- The query returned zero rows (that is a valid result, not an error)
- A health check found an unhealthy service (the tool succeeded — it found the status)

### Security Considerations

#### SQL Injection Prevention

Always parameterize queries. The MCP server sits between Claude and your database. Claude generates SQL — you must treat it as untrusted input.

```typescript
// SAFE: parameterized
await executeQuery('SELECT * FROM users WHERE id = ? AND status = ?', [id, status]);

// UNSAFE: string interpolation
await executeQuery(`SELECT * FROM users WHERE id = ${id}`);
```

#### File Path Validation

If your tool accepts file paths, validate them against an allowlist:

```typescript
const ALLOWED_DIRS = ['/app/data', '/app/exports', '/tmp'];

function isPathAllowed(filePath: string): boolean {
  const resolved = path.resolve(filePath);
  return ALLOWED_DIRS.some(dir => resolved.startsWith(dir));
}
```

#### Trust Boundaries

Claude is not a malicious actor, but it can make mistakes. Design tools defensively:

- **Limit SQL operations:** Consider read-only tools that only allow SELECT, not INSERT/UPDATE/DELETE
- **Scope database access:** Use `withSchema()` to restrict queries to specific schemas
- **Timeout all operations:** Prevent runaway queries with statement timeouts
- **Log everything:** Every tool invocation should be logged with session ID for audit

---

## Chapter 5: Adding Custom Tools

### Step by Step: Build a New Tool

Let's build a `list_tables` tool that shows database tables and their row counts.

#### Step 1: Create the Tool File

Create `mcp-server/src/tools/list-tables.ts`:

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { executeQuery } from '../services/database.js';
import { createChildLogger } from '../services/logger.js';

const log = createChildLogger('tool:list-tables');

/**
 * Register the `list_tables` tool.
 *
 * Returns all tables in a database schema with their row counts,
 * column counts, and approximate size.
 */
export function registerListTablesTool(server: McpServer): void {
  server.tool(
    'list_tables',
    'List all tables in a database schema with row counts and column counts.',
    {
      schema: z.string().optional().describe(
        'Database schema to inspect. Defaults to the configured DB_NAME.'
      ),
    },
    async ({ schema }) => {
      log.info({ schema }, 'listing tables');

      try {
        // MySQL-specific query. Adapt for PostgreSQL/SQLite.
        const { rows } = await executeQuery(
          `SELECT
             TABLE_NAME AS table_name,
             TABLE_ROWS AS approx_rows,
             DATA_LENGTH + INDEX_LENGTH AS size_bytes
           FROM information_schema.TABLES
           WHERE TABLE_SCHEMA = ?
           ORDER BY TABLE_NAME`,
          [schema || process.env['DB_NAME'] || 'app'],
        );

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ tables: rows, count: rows.length }, null, 2),
          }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error({ err, schema }, 'list_tables failed');
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
          isError: true,
        };
      }
    },
  );
}
```

#### Step 2: Register the Tool

In `mcp-server/src/index.ts`, import and register:

```typescript
import { registerListTablesTool } from './tools/list-tables.js';

// ... existing tool registrations ...
registerListTablesTool(server);
```

#### Step 3: Build

```bash
cd mcp-server
npm run build
```

Verify there are no TypeScript errors.

#### Step 4: Test Manually

You can test MCP tools without Claude Code by sending JSON-RPC over stdin:

```bash
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"list_tables","arguments":{"schema":"app"}},"id":1}' | \
  DB_HOST=localhost DB_USER=root DB_NAME=app \
  node mcp-server/dist/index.js
```

Or use the MCP Inspector tool if available:

```bash
npx @modelcontextprotocol/inspector mcp-server/dist/index.js
```

#### Step 5: Test with Claude Code

Start a Claude Code session and try:

```
Can you list all tables in the database?
```

Claude should discover and call your `list_tables` tool.

### Testing Your Tool

#### Unit Testing

Test the handler logic independently from the MCP framework:

```typescript
// mcp-server/src/tools/__tests__/list-tables.test.ts

import { describe, it, expect, vi } from 'vitest';

// Mock the database
vi.mock('../services/database.js', () => ({
  executeQuery: vi.fn().mockResolvedValue({
    rows: [
      { table_name: 'users', approx_rows: 100, size_bytes: 16384 },
      { table_name: 'orders', approx_rows: 500, size_bytes: 65536 },
    ],
    rowCount: 2,
  }),
}));

import { executeQuery } from '../services/database.js';

describe('list_tables', () => {
  it('should query information_schema with the provided schema', async () => {
    // Extract handler logic into a testable function
    // or test through the MCP server test harness
    await executeQuery(expect.stringContaining('information_schema'), ['mydb']);
    expect(executeQuery).toHaveBeenCalledWith(
      expect.any(String),
      ['mydb'],
    );
  });
});
```

#### Integration Testing

Test the full MCP round-trip:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerListTablesTool } from '../tools/list-tables.js';

const server = new McpServer({ name: 'test', version: '1.0.0' });
registerListTablesTool(server);

// Use the SDK's test transport to call tools
const result = await server.callTool('list_tables', { schema: 'test_db' });
expect(result.isError).toBeFalsy();
```

### Registering with Claude Code

After building your tool, Claude Code discovers it automatically at the next session start. The tool appears in Claude's available tools list because the MCP server registers it during the handshake.

If Claude does not seem to find your tool:

1. **Rebuild:** `cd mcp-server && npm run build`
2. **Restart Claude Code:** Close and reopen the session
3. **Check the MCP server config:** Verify `mcpServers` in settings points to the correct entry point
4. **Check logs:** Look at stderr output from the MCP server for startup errors

---

## Chapter 6: Advanced Patterns

### AsyncLocalStorage for Correlation IDs

Every tool call should be traceable. The kit uses Node.js `AsyncLocalStorage` to attach a correlation ID to all log entries within a request:

```typescript
import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  correlation_id: string;
  session_id?: string;
}

const requestStore = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return requestStore.run(ctx, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return requestStore.getStore();
}
```

**Usage in a tool handler:**

```typescript
import { randomUUID } from 'node:crypto';
import { runWithRequestContext } from '../services/logger.js';

async (args) => {
  return runWithRequestContext(
    { correlation_id: randomUUID(), session_id: args.session_id },
    async () => {
      // All log entries inside this block automatically include
      // correlation_id and session_id
      log.info({ action: 'query' }, 'executing');
      const result = await executeQuery(args.sql);
      log.info({ rowCount: result.rowCount }, 'query complete');
      return ok(result);
    },
  );
}
```

**Why this matters:** When debugging a production issue, you can filter logs by `correlation_id` to see every log entry from a single tool call, across all services.

### Per-Schema Database Access

Many projects have multiple database schemas (e.g., `app`, `auth`, `analytics`). The kit supports schema scoping:

```typescript
// Query the 'auth' schema specifically
const { rows } = await executeQuery(
  'SELECT * FROM users WHERE id = ?',
  [userId],
  'auth',  // schema parameter
);
```

Under the hood, Knex uses `withSchema()`:

```typescript
const target = schema ? db.withSchema(schema) : db;
const result = await target.raw(sql, params);
```

This is especially useful when your MCP server needs to query multiple databases or schemas that have tables with the same names.

**Design pattern for multi-schema tools:**

```typescript
server.tool(
  'query',
  'Run a SQL query against any schema',
  {
    sql: z.string().describe('SQL query'),
    params: z.array(z.unknown()).optional(),
    schema: z.enum(['app', 'auth', 'analytics']).describe('Target schema'),
  },
  async ({ sql, params, schema }) => {
    // The schema enum restricts which schemas Claude can query
    return ok(await executeQuery(sql, params ?? [], schema));
  },
);
```

### Vector Search Integration

For projects with knowledge management, vector search enables semantic queries:

```typescript
// Concept: store embeddings alongside knowledge entries

import { pipeline } from '@xenova/transformers';

let embedder: any = null;

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
}

async function embed(text: string): Promise<number[]> {
  const model = await getEmbedder();
  const output = await model(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

// At indexing time:
const vector = await embed('how to handle authentication');
await db.insert({ content: '...', embedding: JSON.stringify(vector) }).into('knowledge');

// At query time:
const queryVector = await embed('login security');
// Compute cosine similarity against stored vectors
```

**Alternative:** Use a dedicated vector database (pgvector, Pinecone, Qdrant) instead of storing embeddings in your application database.

**When to add vector search:**
- You have 50+ knowledge entries
- Keyword search (grep) is too noisy
- Users ask conceptual questions ("how do we handle X" vs "find function X")

### Deferred Tool Loading

Claude Code supports deferred tool loading — tools are listed by name but their schemas are not loaded until requested via `ToolSearch`. This is useful when:

- You have many tools and want to keep the initial handshake small
- Some tools are rarely used and do not need to be always-present
- You want to reduce Claude's decision space (fewer tools = more focused behavior)

**How it works from Claude's perspective:**

```
1. Claude sees "list_tables" in the deferred tools list
2. When Claude needs it, it calls ToolSearch({ query: "list_tables" })
3. ToolSearch returns the full schema (name, description, parameters)
4. Claude can now call the tool normally
```

This is transparent to the tool implementation — you register tools normally. The deferral is configured at the Claude Code level.

### Rate Limiting

Protect expensive tools from being called too frequently:

```typescript
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(toolName: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const key = toolName;
  const entry = rateLimits.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= maxPerMinute) {
    return false;  // Rate limited
  }

  entry.count++;
  return true;
}

// In your tool handler:
async (args) => {
  if (!checkRateLimit('run_query', 30)) {
    return error('Rate limited: max 30 queries per minute');
  }
  // ... execute query
}
```

For production, use Redis-based rate limiting (atomic increments with TTL):

```typescript
async function checkRateLimitRedis(
  key: string,
  maxPerMinute: number,
): Promise<boolean> {
  const redis = getRedis();
  const redisKey = `ratelimit:${key}`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.expire(redisKey, 60);
  }
  return count <= maxPerMinute;
}
```

### Batch Operations

When a tool needs multiple related database queries, batch them:

```typescript
// BAD: N+1 queries
for (const userId of userIds) {
  const user = await executeQuery('SELECT * FROM users WHERE id = ?', [userId]);
  results.push(user.rows[0]);
}

// GOOD: single batch query
const placeholders = userIds.map(() => '?').join(',');
const { rows } = await executeQuery(
  `SELECT * FROM users WHERE id IN (${placeholders})`,
  userIds,
);
```

### Streaming Large Results

For queries that return many rows, consider pagination instead of returning everything:

```typescript
server.tool(
  'query_paginated',
  'Execute a paginated SQL query',
  {
    sql: z.string(),
    page: z.number().min(1).default(1).describe('Page number (1-based)'),
    page_size: z.number().min(1).max(100).default(20).describe('Rows per page'),
  },
  async ({ sql, page, page_size }) => {
    const offset = (page - 1) * page_size;
    const paginatedSql = `${sql} LIMIT ? OFFSET ?`;
    const result = await executeQuery(paginatedSql, [page_size, offset]);

    return ok({
      rows: result.rows,
      page,
      page_size,
      has_more: result.rows.length === page_size,
    });
  },
);
```

This prevents tools from returning 10,000 rows into Claude's context (which would consume all available tokens and degrade response quality).

### Error Recovery Patterns

Design tools to be self-healing when possible:

```typescript
async function executeWithRetry(
  sql: string,
  params: unknown[],
  maxRetries = 2,
): Promise<{ rows: unknown[]; rowCount: number }> {
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await executeQuery(sql, params);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';

      // Retry on transient errors only
      if (attempt <= maxRetries && isTransientError(message)) {
        log.warn({ attempt, maxRetries, err }, 'retrying transient error');
        await new Promise(r => setTimeout(r, attempt * 500));
        continue;
      }

      throw err;  // Non-transient or out of retries
    }
  }
  throw new Error('unreachable');
}

function isTransientError(message: string): boolean {
  return (
    message.includes('ECONNRESET') ||
    message.includes('ETIMEDOUT') ||
    message.includes('deadlock') ||
    message.includes('lock wait timeout')
  );
}
```

Only retry on errors you know are transient. Retrying a syntax error or a constraint violation wastes time and resources.

---

## Token-Efficient Output Formats (Opus 4.7+)

When your MCP tools return tabular data (multiple rows with the same columns), the response shape matters for token economy. JSON is verbose. Newer Claude models work well with column-prefixed compact notations like **TOON** (Token-Optimized Output Notation).

**JSON (verbose):**
```json
{
  "rows": [
    {"id": 1, "name": "alice", "role": "admin"},
    {"id": 2, "name": "bob", "role": "user"},
    {"id": 3, "name": "carol", "role": "user"}
  ]
}
```

**TOON-style (compact, same data):**
```
rows:
  cols:id|name|role
  1|alice|admin
  2|bob|user
  3|carol|user
```

The compact form saves 40-60% tokens for tables of more than ~3 rows. Implementation pattern:

```typescript
function toTOON(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return 'rows: []';
  const cols = Object.keys(rows[0]);
  const header = `  cols:${cols.join('|')}`;
  const body = rows.map(r => '  ' + cols.map(c => String(r[c] ?? '')).join('|')).join('\n');
  return `rows:\n${header}\n${body}`;
}
```

Make this an opt-in output format on tools that can return many rows (database queries, list endpoints). Accept an `output_format: "json" | "toon"` parameter and let the caller pick.

The kit's reference `query` tool can be extended this way — it is a natural fit for any tool returning result sets.

## Long-Running Operations and Heartbeat Patterns

Claude Code on 4.7 spawns fewer subagents and makes fewer tool calls by default. For tools that wrap long-running work (deploys, batch jobs, external API polls), return immediately with a status handle and let the agent re-check on its own schedule rather than blocking the call.

Pattern:

1. Tool kicks off work, returns `{ status: "queued", job_id: "abc-123", eta_seconds: 600 }` immediately.
2. Agent uses Claude Code's `ScheduleWakeup` (when self-pacing) or a separate poll tool to check back.
3. Poll tool returns `{ status: "running" | "completed" | "failed", ... }`.

This pattern keeps the agent's prompt cache warm (no synchronous 10-minute blocks) and lets the agent do other work between polls.
