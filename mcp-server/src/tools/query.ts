import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { executeQuery } from '../services/database.js';
import { createChildLogger } from '../services/logger.js';

const log = createChildLogger('tool:query');

// ---------------------------------------------------------------------------
// Security: operation whitelist
// ---------------------------------------------------------------------------

const READ_ONLY_OPS = new Set(['SELECT', 'DESCRIBE', 'DESC', 'SHOW', 'EXPLAIN']);
const WRITE_OPS = new Set(['INSERT', 'UPDATE', 'DELETE', 'REPLACE', 'MERGE']);

function isWriteAllowed(): boolean {
  return process.env['ALLOW_WRITE_QUERIES']?.toLowerCase() === 'true';
}

/**
 * Extract the leading SQL keyword (e.g. SELECT, INSERT) from a statement.
 * Strips leading whitespace, comments, and CTEs.
 */
function extractOperation(sql: string): string {
  // Remove leading whitespace, single-line comments (-- ...), and block comments (/* ... */)
  const cleaned = sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*(--[^\n]*\n\s*)*/g, '')
    .trim();
  const firstWord = cleaned.split(/\s+/)[0]?.toUpperCase() ?? '';
  // WITH ... AS (...) <DML> — check if the CTE body contains write operations
  if (firstWord === 'WITH') {
    const upperSql = cleaned.toUpperCase();
    if (/\b(INSERT|UPDATE|DELETE)\b/.test(upperSql)) {
      const match = upperSql.match(/\b(INSERT|UPDATE|DELETE)\b/);
      return match ? match[1] : 'SELECT';
    }
    return 'SELECT';
  }
  return firstWord;
}

function isOperationAllowed(operation: string): boolean {
  if (READ_ONLY_OPS.has(operation)) return true;
  if (WRITE_OPS.has(operation) && isWriteAllowed()) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

const queryParams = {
  sql: z.string().describe('SQL statement to execute. Use ? for parameter placeholders.'),
  params: z.array(z.unknown()).optional().describe('Bind parameters for ? placeholders in the SQL statement.'),
  schema: z.string().optional().describe('Database schema/name to scope the query to.'),
};

/**
 * Register the `query` tool.
 *
 * Executes SQL queries against the configured database. By default only
 * read-only operations (SELECT, DESCRIBE, SHOW, EXPLAIN) are allowed.
 * Set the `ALLOW_WRITE_QUERIES=true` environment variable to enable
 * INSERT, UPDATE, and DELETE.
 *
 * **Security note:** This tool executes raw SQL. Only expose this server
 * to trusted clients. The operation whitelist provides a basic safety net
 * but is NOT a substitute for proper access control at the database level.
 */
export function registerQueryTool(server: McpServer): void {
  const writeNote = isWriteAllowed()
    ? ' WRITE QUERIES ARE ENABLED (INSERT/UPDATE/DELETE allowed).'
    : ' Only read-only queries are allowed (SELECT, DESCRIBE, SHOW, EXPLAIN). Set ALLOW_WRITE_QUERIES=true to enable writes.';

  server.tool(
    'query',
    `Execute SQL queries against the database.${writeNote} SECURITY WARNING: This tool runs raw SQL — only expose to trusted clients.`,
    queryParams,
    async (args) => {
      const { sql, params, schema } = args;
      const operation = extractOperation(sql);

      log.info({ operation, schema, paramCount: params?.length ?? 0 }, 'query requested');

      if (!isOperationAllowed(operation)) {
        const msg = isWriteAllowed()
          ? `Operation "${operation}" is not recognized as an allowed SQL operation.`
          : `Operation "${operation}" is not allowed. Only read-only queries (SELECT, DESCRIBE, SHOW, EXPLAIN) are permitted. Set ALLOW_WRITE_QUERIES=true to enable writes.`;
        log.warn({ operation }, 'query blocked by operation whitelist');
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: msg }) }],
          isError: true,
        };
      }

      try {
        const result = await executeQuery(sql, params ?? [], schema);
        log.info({ operation, rowCount: result.rowCount }, 'query executed');
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ rowCount: result.rowCount, rows: result.rows }, null, 2),
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error({ err, operation }, 'query execution failed');
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
          isError: true,
        };
      }
    },
  );
}
