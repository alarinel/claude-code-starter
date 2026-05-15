/**
 * claude-code-starter — Subagent Lifecycle Hook
 *
 * Event:   SubagentCompleted (fires when a spawned subagent finishes)
 * Purpose: Track agent spawn and completion events by appending structured
 *          records to agents.jsonl. Provides an audit trail of all subagent
 *          activity within the session.
 *
 * Input:   JSON via stdin with subagent details (agent_id, status, duration, etc.)
 * Output:  "Agent {agent_id} completed with status {status}" to stdout
 */

import { join } from 'node:path';
import {
  getSessionId,
  getSessionLogDir,
  readStdin,
  safeParseJson,
  appendLog,
} from './lib/helpers.mjs';

async function main() {
  try {
    const raw = await readStdin();
    const payload = safeParseJson(raw);
    if (!payload) return;

    const sessionId = getSessionId();
    const logDir = getSessionLogDir(sessionId);
    const logPath = join(logDir, 'agents.jsonl');
    const timestamp = new Date().toISOString();

    // Extract subagent fields from the payload.
    // Claude Code may use different field names depending on version,
    // so we check multiple possible locations.
    const agentId =
      payload.agent_id ||
      payload.agentId ||
      payload.id ||
      payload.session_id ||
      'unknown';

    const status =
      payload.status ||
      payload.result ||
      payload.exit_status ||
      'unknown';

    const durationMs =
      payload.duration_ms ??
      payload.durationMs ??
      payload.duration ??
      null;

    const taskSummary =
      payload.task_summary ||
      payload.summary ||
      payload.description ||
      null;

    const exitCode =
      payload.exit_code ??
      payload.exitCode ??
      null;

    const entry = {
      ts: timestamp,
      event: 'subagent_completed',
      agent_id: agentId,
      status,
      ...(durationMs != null && { duration_ms: durationMs }),
      ...(exitCode != null && { exit_code: exitCode }),
      ...(taskSummary && { summary: taskSummary }),
      // Preserve any extra fields from the payload that we did not
      // explicitly extract, for forward compatibility.
      ...(payload.tool_calls != null && { tool_calls: payload.tool_calls }),
      ...(payload.error && { error: payload.error }),
    };

    appendLog(logPath, JSON.stringify(entry) + '\n');

    process.stdout.write(`Agent ${agentId} completed with status ${status}\n`);
  } catch {
    // Hooks must never block or crash. Swallow all errors.
  }
}

main().then(() => process.exit(0)).catch(() => process.exit(0));
