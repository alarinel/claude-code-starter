import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getDatabase } from '../services/database.js';
import { createChildLogger } from '../services/logger.js';

const log = createChildLogger('tool:knowledge');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABLE = 'knowledge';
const VALID_TYPES = ['gotcha', 'pattern', 'context', 'documentation', 'tool'] as const;

// ---------------------------------------------------------------------------
// Schema bootstrap — creates the table if it does not exist
// ---------------------------------------------------------------------------

let tableEnsured = false;

async function ensureTable(): Promise<void> {
  if (tableEnsured) return;
  const db = getDatabase();
  const exists = await db.schema.hasTable(TABLE);
  if (!exists) {
    log.info('creating knowledge table');
    await db.schema.createTable(TABLE, (t: import('knex').Knex.CreateTableBuilder) => {
      t.increments('id').primary();
      t.string('type', 50).notNullable().index();
      t.string('title', 500).notNullable();
      t.text('content').notNullable();
      t.timestamp('created_at').defaultTo(db.fn.now());
      t.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }
  tableEnsured = true;
}

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

const knowledgeParams = {
  action: z.enum(['list', 'get', 'create', 'update', 'delete']).describe('CRUD action to perform'),
  id: z.number().optional().describe('Knowledge entry ID (required for get, update, delete)'),
  type: z
    .enum(VALID_TYPES)
    .optional()
    .describe('Entry type — one of: gotcha, pattern, context, documentation, tool. Required for create; optional filter for list.'),
  title: z.string().optional().describe('Entry title (required for create)'),
  content: z.string().optional().describe('Entry content body (required for create)'),
};

/**
 * Register the `knowledge` tool.
 *
 * Full CRUD for a `knowledge` table. The table is auto-created on first
 * use. Entries are typed (gotcha, pattern, context, documentation, tool)
 * and can be filtered by type on list.
 */
export function registerKnowledgeTool(server: McpServer): void {
  server.tool(
    'knowledge',
    'CRUD operations on a knowledge base. Supports types: gotcha, pattern, context, documentation, tool.',
    knowledgeParams,
    async (args) => {
      const { action, id, type, title, content } = args;
      log.info({ action, id, type }, 'knowledge tool invoked');

      try {
        await ensureTable();
        const db = getDatabase();

        switch (action) {
          // ---------------------------------------------------------------
          case 'list': {
            let query = db(TABLE).select('*').orderBy('updated_at', 'desc');
            if (type) {
              query = query.where('type', type);
            }
            const rows = await query;
            return ok({ count: rows.length, entries: rows });
          }

          // ---------------------------------------------------------------
          case 'get': {
            if (id == null) return error('id is required for get action');
            const row = await db(TABLE).where('id', id).first();
            if (!row) return error(`Knowledge entry ${id} not found`);
            return ok(row);
          }

          // ---------------------------------------------------------------
          case 'create': {
            if (!type) return error('type is required for create action');
            if (!title) return error('title is required for create action');
            if (!content) return error('content is required for create action');
            const result = await db(TABLE).insert({
              type,
              title,
              content,
              created_at: db.fn.now(),
              updated_at: db.fn.now(),
            }).returning('id');
            // MySQL returns the insertId directly; PostgreSQL returns an array of objects with 'id'
            const insertedId = typeof result[0] === 'object' && result[0] !== null
              ? (result[0] as Record<string, unknown>).id
              : result[0];
            const created = insertedId
              ? await db(TABLE).where('id', insertedId).first()
              : await db(TABLE).where({ type, title }).orderBy('created_at', 'desc').first();
            log.info({ id: insertedId, type, title }, 'knowledge entry created');
            return ok(created);
          }

          // ---------------------------------------------------------------
          case 'update': {
            if (id == null) return error('id is required for update action');
            const existing = await db(TABLE).where('id', id).first();
            if (!existing) return error(`Knowledge entry ${id} not found`);

            const updates: Record<string, unknown> = { updated_at: db.fn.now() };
            if (type) updates['type'] = type;
            if (title) updates['title'] = title;
            if (content) updates['content'] = content;

            await db(TABLE).where('id', id).update(updates);
            const updated = await db(TABLE).where('id', id).first();
            log.info({ id, ...updates }, 'knowledge entry updated');
            return ok(updated);
          }

          // ---------------------------------------------------------------
          case 'delete': {
            if (id == null) return error('id is required for delete action');
            const target = await db(TABLE).where('id', id).first();
            if (!target) return error(`Knowledge entry ${id} not found`);
            await db(TABLE).where('id', id).del();
            log.info({ id }, 'knowledge entry deleted');
            return ok({ deleted: true, id });
          }

          default:
            return error(`Unknown action: ${action as string}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error({ err, action }, 'knowledge tool error');
        return error(message);
      }
    },
  );
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function ok(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

function error(message: string) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}
