/**
 * claude-code-starter — Session Inject Hook
 *
 * Event:   UserPromptSubmit
 * Purpose: Extract and output session identifiers so the AI can reference them.
 *          Logs the prompt text to a file for observability.
 *
 * Output:  [SESSION] short_id=XXXXXXXX session_id=full-uuid
 */

import { join } from 'node:path';
import {
  getSessionId,
  getShortId,
  getSessionLogDir,
  readStdin,
  safeParseJson,
  appendLog,
} from './lib/helpers.mjs';

async function main() {
  try {
    const sessionId = getSessionId();
    const shortId = getShortId(sessionId);

    // Output session identifiers so the AI can read them from hook output.
    process.stdout.write(`[SESSION] short_id=${shortId} session_id=${sessionId}\n`);

    // Read prompt from stdin (Claude Code sends JSON with the prompt text).
    const raw = await readStdin();
    const payload = safeParseJson(raw);

    if (payload) {
      const promptText =
        payload.prompt ||
        payload.message ||
        payload.content ||
        (typeof payload === 'string' ? payload : '');

      if (promptText) {
        const logDir = getSessionLogDir(sessionId);
        const logPath = join(logDir, 'prompts.log');
        const timestamp = new Date().toISOString();
        appendLog(logPath, `[${timestamp}] ${promptText}\n`);
      }
    }
  } catch {
    // Hooks must never block the user. Swallow all errors.
  }
}

main().then(() => process.exit(0)).catch(() => process.exit(0));
