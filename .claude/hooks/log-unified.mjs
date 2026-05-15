/**
 * claude-code-starter — Unified Tool Logger Hook
 *
 * Event:   PostToolUse
 * Purpose: Log every tool call to a JSONL file for observability.
 *
 * High-volume tools (Read, Glob, Grep, Bash) get minimal logging to
 * keep the log file manageable. All other tools get full parameter logging.
 */

import { join } from 'node:path';
import {
  getSessionId,
  getSessionLogDir,
  readStdin,
  safeParseJson,
  appendLog,
} from './lib/helpers.mjs';

// Tools that fire very frequently — log only name + timestamp, skip params.
const HIGH_VOLUME_TOOLS = new Set([
  'Read', 'Glob', 'Grep', 'Bash',
  'read', 'glob', 'grep', 'bash',
]);

async function main() {
  try {
    const raw = await readStdin();
    const payload = safeParseJson(raw);
    if (!payload) return;

    const sessionId = getSessionId();
    const logDir = getSessionLogDir(sessionId);
    const logPath = join(logDir, 'actions.jsonl');

    const toolName = payload.tool_name || payload.name || 'unknown';
    const timestamp = new Date().toISOString();

    let entry;

    if (HIGH_VOLUME_TOOLS.has(toolName)) {
      // Fast path: minimal record for chatty tools.
      entry = {
        ts: timestamp,
        tool: toolName,
        ...(payload.duration_ms != null && { ms: payload.duration_ms }),
      };
    } else {
      // Full path: include parameters and result summary.
      entry = {
        ts: timestamp,
        tool: toolName,
        ...(payload.duration_ms != null && { ms: payload.duration_ms }),
        ...(payload.parameters && { params: payload.parameters }),
        ...(payload.result && {
          result_preview: typeof payload.result === 'string'
            ? payload.result.slice(0, 200)
            : '(object)',
        }),
      };
    }

    appendLog(logPath, JSON.stringify(entry) + '\n');
  } catch {
    // Swallow — hooks must never crash.
  }
}

main().then(() => process.exit(0)).catch(() => process.exit(0));
