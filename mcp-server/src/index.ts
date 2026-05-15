#!/usr/bin/env node

/**
 * MCP Server — Production-grade boilerplate
 *
 * A Model Context Protocol server with database, Redis, health checks,
 * circuit breakers, and structured logging. All backend services are
 * initialized lazily (only when the first tool that needs them is called).
 *
 * Tools:
 *   - health    — Aggregate health check (DB, Redis, custom services)
 *   - session   — Session management (status, list, rename)
 *   - query     — Execute SQL queries (read-only by default)
 *   - knowledge — CRUD for a knowledge base table
 *   - terminal  — Execute shell commands and read output
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { logger } from './services/logger.js';
import { destroyDatabase } from './services/database.js';
import { destroyRedis } from './services/redis.js';
import { destroyAllCircuitBreakers } from './services/circuit-breaker.js';

import { registerHealthTool } from './tools/health.js';
import { registerSessionTool } from './tools/session.js';
import { registerQueryTool } from './tools/query.js';
import { registerKnowledgeTool } from './tools/knowledge.js';
import { registerTerminalTool } from './tools/terminal.js';

// ---------------------------------------------------------------------------
// Server initialization
// ---------------------------------------------------------------------------

const SERVER_NAME = process.env['MCP_SERVER_NAME'] ?? 'mcp-server';
const SERVER_VERSION = process.env['MCP_SERVER_VERSION'] ?? '1.0.0';

const server = new McpServer({
  name: SERVER_NAME,
  version: SERVER_VERSION,
});

// Register all tools
registerHealthTool(server);
registerSessionTool(server);
registerQueryTool(server);
registerKnowledgeTool(server);
registerTerminalTool(server);

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, 'shutdown initiated');

  try {
    destroyAllCircuitBreakers();
    await Promise.allSettled([destroyDatabase(), destroyRedis()]);
    logger.info('shutdown complete');
  } catch (err) {
    logger.error({ err }, 'error during shutdown');
  }

  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

// ---------------------------------------------------------------------------
// Start the server
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info({ name: SERVER_NAME, version: SERVER_VERSION }, 'MCP server started on stdio transport');
}

main().catch((err) => {
  logger.fatal({ err }, 'failed to start MCP server');
  process.exit(1);
});
