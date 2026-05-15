import { z } from 'zod';
import { spawn, type ChildProcess } from 'node:child_process';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createChildLogger } from '../services/logger.js';

const log = createChildLogger('tool:terminal');

// ---------------------------------------------------------------------------
// Terminal process registry
// ---------------------------------------------------------------------------

interface TerminalEntry {
  id: string;
  command: string;
  process: ChildProcess;
  output: string[];
  started_at: string;
  exit_code: number | null;
}

const terminals = new Map<string, TerminalEntry>();
let nextId = 1;

const MAX_OUTPUT_LINES = 500;
const COMMAND_TIMEOUT_MS = parseInt(process.env['TERMINAL_TIMEOUT_MS'] ?? '30000', 10);

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

const terminalParams = {
  action: z.enum(['list', 'send', 'read']).describe('Action: list running terminals, send a command, or read output'),
  terminal_id: z.string().optional().describe('Terminal ID (required for read)'),
  command: z.string().optional().describe('Shell command to execute (required for send)'),
};

/**
 * Register the `terminal` tool.
 *
 * Provides simplified terminal management:
 * - **list**: Show all tracked terminal processes and their status
 * - **send**: Execute a shell command, wait for completion, return output
 * - **read**: Read buffered output from a previously-sent command
 */
export function registerTerminalTool(server: McpServer): void {
  server.tool(
    'terminal',
    'Execute shell commands and manage terminal output. Actions: list, send, read.',
    terminalParams,
    async (args) => {
      const { action, terminal_id, command } = args;
      log.info({ action, terminal_id }, 'terminal tool invoked');

      try {
        switch (action) {
          // ---------------------------------------------------------------
          case 'list': {
            const entries = Array.from(terminals.values()).map((t) => ({
              id: t.id,
              command: t.command,
              started_at: t.started_at,
              exit_code: t.exit_code,
              running: t.exit_code === null,
              output_lines: t.output.length,
            }));
            return ok({ count: entries.length, terminals: entries });
          }

          // ---------------------------------------------------------------
          case 'send': {
            if (!command) {
              return error('command is required for send action');
            }
            const result = await executeCommand(command);
            return ok(result);
          }

          // ---------------------------------------------------------------
          case 'read': {
            if (!terminal_id) {
              return error('terminal_id is required for read action');
            }
            const entry = terminals.get(terminal_id);
            if (!entry) {
              return error(`Terminal ${terminal_id} not found`);
            }
            return ok({
              id: entry.id,
              command: entry.command,
              exit_code: entry.exit_code,
              running: entry.exit_code === null,
              output: entry.output.join('\n'),
            });
          }

          default:
            return error(`Unknown action: ${action as string}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error({ err, action }, 'terminal tool error');
        return error(message);
      }
    },
  );
}

// ---------------------------------------------------------------------------
// Command execution
// ---------------------------------------------------------------------------

interface CommandResult {
  id: string;
  command: string;
  exit_code: number | null;
  output: string;
  timed_out: boolean;
}

function executeCommand(command: string): Promise<CommandResult> {
  return new Promise((resolve) => {
    const id = `term_${nextId++}`;
    const isWin = process.platform === 'win32';
    const shell = isWin ? 'cmd' : '/bin/sh';
    const shellArgs = isWin ? ['/c', command] : ['-c', command];

    const child = spawn(shell, shellArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    const entry: TerminalEntry = {
      id,
      command,
      process: child,
      output: [],
      started_at: new Date().toISOString(),
      exit_code: null,
    };
    terminals.set(id, entry);

    // Prune completed terminals when the map exceeds 100 entries
    if (terminals.size > 100) {
      for (const [key, val] of terminals) {
        if (val.exit_code !== null) {
          terminals.delete(key);
          if (terminals.size <= 100) break;
        }
      }
    }

    const appendLine = (line: string) => {
      entry.output.push(line);
      if (entry.output.length > MAX_OUTPUT_LINES) {
        entry.output.shift();
      }
    };

    child.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.length > 0) appendLine(line);
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.length > 0) appendLine(`[stderr] ${line}`);
      }
    });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      appendLine(`[timeout] Command killed after ${COMMAND_TIMEOUT_MS}ms`);
    }, COMMAND_TIMEOUT_MS);

    child.on('close', (code) => {
      clearTimeout(timer);
      entry.exit_code = code;
      log.info({ id, command, exit_code: code, timedOut }, 'command completed');
      resolve({
        id,
        command,
        exit_code: code,
        output: entry.output.join('\n'),
        timed_out: timedOut,
      });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      entry.exit_code = -1;
      appendLine(`[error] ${err.message}`);
      log.error({ id, err }, 'command spawn error');
      resolve({
        id,
        command,
        exit_code: -1,
        output: entry.output.join('\n'),
        timed_out: false,
      });
    });
  });
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
