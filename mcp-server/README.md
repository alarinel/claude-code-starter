# MCP Server Boilerplate

Production-grade Model Context Protocol server with database, Redis, health checks, circuit breakers, and structured logging.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   MCP Server (stdio)                │
│                                                     │
│  ┌─────────┐ ┌─────────┐ ┌───────┐ ┌───────────┐  │
│  │ health  │ │ session │ │ query │ │ knowledge │  │
│  └────┬────┘ └────┬────┘ └───┬───┘ └─────┬─────┘  │
│       │           │          │            │         │
│  ┌────┴───────────┴──────────┴────────────┴──────┐  │
│  │              Service Layer                     │  │
│  │  ┌──────────┐ ┌───────┐ ┌────────────────┐   │  │
│  │  │ database │ │ redis │ │ circuit-breaker│   │  │
│  │  │  (knex)  │ │(ioredis)│ │  (opossum)    │   │  │
│  │  └──────────┘ └───────┘ └────────────────┘   │  │
│  │  ┌────────┐  ┌────────────────────────────┐   │  │
│  │  │ logger │  │ health (aggregator)        │   │  │
│  │  │ (pino) │  │                            │   │  │
│  │  └────────┘  └────────────────────────────┘   │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  AsyncLocalStorage ─── correlation IDs in all logs  │
└─────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the env reference below and set values for your environment. At minimum you need database credentials if using the `query` or `knowledge` tools.

### 3. Build

```bash
npm run build
```

### 4. Register with Claude Code

Add to your `.claude/settings.json` or project settings:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["path/to/mcp-server/dist/index.js"],
      "env": {
        "DB_CLIENT": "mysql2",
        "DB_HOST": "127.0.0.1",
        "DB_PORT": "3306",
        "DB_USER": "root",
        "DB_PASSWORD": "secret",
        "DB_NAME": "myapp",
        "REDIS_HOST": "127.0.0.1"
      }
    }
  }
}
```

### 5. Development mode

```bash
npm run dev
```

Uses `tsx --watch` for auto-reload on file changes.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_CLIENT` | `mysql2` | Knex database client (`mysql2`, `pg`, `better-sqlite3`) |
| `DB_HOST` | `127.0.0.1` | Database host |
| `DB_PORT` | `3306` | Database port |
| `DB_USER` | `root` | Database user |
| `DB_PASSWORD` | *(empty)* | Database password |
| `DB_NAME` | `app` | Database name |
| `DB_POOL_MIN` | `2` | Minimum connection pool size |
| `DB_POOL_MAX` | `10` | Maximum connection pool size |
| `REDIS_HOST` | `127.0.0.1` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | *(none)* | Redis password |
| `REDIS_DB` | `0` | Redis database number |
| `LOG_LEVEL` | `info` | Pino log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`) |
| `ALLOW_WRITE_QUERIES` | `false` | Set to `true` to allow INSERT/UPDATE/DELETE in the query tool |
| `TERMINAL_TIMEOUT_MS` | `30000` | Command timeout for the terminal tool |
| `MCP_SERVER_NAME` | `mcp-server` | Server name reported to MCP clients |
| `MCP_SERVER_VERSION` | `1.0.0` | Server version reported to MCP clients |

## Tools

### `health`

Zero-parameter health check. Returns aggregate status across all services.

```json
{
  "status": "healthy",
  "services": [
    { "name": "database", "status": "healthy", "latency_ms": 3 },
    { "name": "redis", "status": "healthy", "latency_ms": 1 }
  ],
  "checked_at": "2026-01-15T10:30:00.000Z",
  "total_latency_ms": 4
}
```

### `session`

Session management with actions: `status`, `list`, `rename`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | `status` \| `list` \| `rename` | Yes | Action to perform |
| `session_id` | string | For status/rename | Session identifier |
| `display_name` | string | For rename | New display name |

### `query`

Execute SQL against the configured database. Read-only by default.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sql` | string | Yes | SQL statement with `?` placeholders |
| `params` | array | No | Bind parameters |
| `schema` | string | No | Database schema to scope to |

**Security:** Only SELECT, DESCRIBE, SHOW, EXPLAIN are allowed by default. Set `ALLOW_WRITE_QUERIES=true` to enable writes. Always use parameterized queries.

### `knowledge`

CRUD for a knowledge base table (auto-created on first use).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | `list` \| `get` \| `create` \| `update` \| `delete` | Yes | CRUD action |
| `id` | number | For get/update/delete | Entry ID |
| `type` | `gotcha` \| `pattern` \| `context` \| `documentation` \| `tool` | For create; filter for list | Entry type |
| `title` | string | For create | Entry title |
| `content` | string | For create | Entry content |

### `terminal`

Execute shell commands and manage output buffers.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | `list` \| `send` \| `read` | Yes | Action to perform |
| `terminal_id` | string | For read | Terminal ID to read from |
| `command` | string | For send | Shell command to execute |

## Adding Custom Tools

1. Create a new file in `src/tools/`:

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createChildLogger } from '../services/logger.js';

const log = createChildLogger('tool:my-tool');

export function registerMyTool(server: McpServer): void {
  server.tool(
    'my_tool',
    'Description of what my tool does.',
    {
      param1: z.string().describe('First parameter'),
      param2: z.number().optional().describe('Optional second parameter'),
    },
    async (args) => {
      log.info({ args }, 'my_tool invoked');
      // Your logic here
      return {
        content: [{ type: 'text', text: JSON.stringify({ result: 'ok' }) }],
      };
    },
  );
}
```

2. Register it in `src/index.ts`:

```typescript
import { registerMyTool } from './tools/my-tool.js';

// After other registrations:
registerMyTool(server);
```

3. Build and restart: `npm run build`

## Adding Custom Health Checks

```typescript
import { registerHealthCheck } from './services/health.js';

registerHealthCheck('my-service', async () => {
  // Return true if healthy, false otherwise
  const response = await fetch('https://api.example.com/health');
  return response.ok;
});
```

Custom checks automatically appear in the `health` tool output.

## Using Circuit Breakers

Wrap unreliable external calls with the circuit breaker:

```typescript
import { createCircuitBreaker } from './services/circuit-breaker.js';

async function callExternalApi(url: string): Promise<Response> {
  return fetch(url);
}

const breaker = createCircuitBreaker('external-api', callExternalApi, {
  timeout: 5000,
  resetTimeout: 30000,
});

// Use it — circuit opens after repeated failures
const response = await breaker.fire('https://api.example.com/data');
```

## Request Context & Correlation IDs

All log entries include a `correlation_id` when running inside a request context:

```typescript
import { runWithRequestContext } from './services/logger.js';
import { randomUUID } from 'node:crypto';

runWithRequestContext(
  { correlation_id: randomUUID(), session_id: 'sess-123' },
  () => {
    // All log calls within this scope include correlation_id and session_id
    log.info('processing request');
  },
);
```

## Database Drivers

Install the driver for your database:

| Database | Package | `DB_CLIENT` value |
|----------|---------|-------------------|
| MySQL | `mysql2` | `mysql2` |
| PostgreSQL | `pg` | `pg` |
| SQLite | `better-sqlite3` | `better-sqlite3` |

```bash
# MySQL (default)
npm install mysql2

# PostgreSQL
npm install pg

# SQLite
npm install better-sqlite3
```

## License

MIT
