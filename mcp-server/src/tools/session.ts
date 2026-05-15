import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createChildLogger } from '../services/logger.js';

const log = createChildLogger('tool:session');

// ---------------------------------------------------------------------------
// In-memory session store (replace with DB/Redis for production persistence)
// ---------------------------------------------------------------------------

interface SessionRecord {
  session_id: string;
  display_name: string;
  created_at: string;
  last_active: string;
}

const sessions = new Map<string, SessionRecord>();

function touchSession(sessionId: string): SessionRecord {
  const now = new Date().toISOString();
  let record = sessions.get(sessionId);
  if (!record) {
    record = {
      session_id: sessionId,
      display_name: sessionId.slice(0, 8),
      created_at: now,
      last_active: now,
    };
    sessions.set(sessionId, record);
  } else {
    record.last_active = now;
  }
  return record;
}

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

const sessionParams = {
  action: z.enum(['status', 'list', 'rename']).describe('Action to perform'),
  session_id: z.string().optional().describe('Session ID (required for status and rename)'),
  display_name: z.string().optional().describe('New display name (required for rename)'),
};

/**
 * Register the `session` tool.
 *
 * Provides basic session management: view status, list active sessions,
 * and rename a session's display name.
 */
export function registerSessionTool(server: McpServer): void {
  server.tool(
    'session',
    'Manage sessions — view status, list active sessions, or rename a session.',
    sessionParams,
    async (args) => {
      const { action, session_id, display_name } = args;
      log.info({ action, session_id }, 'session tool invoked');

      try {
        switch (action) {
          case 'status': {
            if (!session_id) {
              return error('session_id is required for status action');
            }
            const record = touchSession(session_id);
            return ok(record);
          }

          case 'list': {
            const all = Array.from(sessions.values()).sort(
              (a, b) => new Date(b.last_active).getTime() - new Date(a.last_active).getTime(),
            );
            return ok({ count: all.length, sessions: all });
          }

          case 'rename': {
            if (!session_id) {
              return error('session_id is required for rename action');
            }
            if (!display_name) {
              return error('display_name is required for rename action');
            }
            const record = touchSession(session_id);
            record.display_name = display_name;
            log.info({ session_id, display_name }, 'session renamed');
            return ok(record);
          }

          default:
            return error(`Unknown action: ${action as string}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error({ err, action }, 'session tool error');
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
