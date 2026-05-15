/**
 * claude-code-starter — Pre-Compact Hook
 *
 * Event:   Notification (fires on context events, including auto-compact)
 * Purpose: Save a state snapshot before Claude Code auto-compacts the
 *          conversation. Captures skills loaded, tool call count, and
 *          recent prompts so that post-compact recovery has context.
 *
 * Input:   JSON via stdin with notification details
 * Output:  "Pre-compact snapshot saved" to stdout
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getSessionId,
  getShortId,
  getSessionLogDir,
  readStdin,
  safeParseJson,
  appendLog,
} from './lib/helpers.mjs';

/**
 * Read a file safely, returning empty string on failure.
 * @param {string} filePath - absolute path
 * @returns {string}
 */
function safeReadFile(filePath) {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

/**
 * Count non-empty lines in a file. Returns 0 if the file does not exist.
 * @param {string} filePath - absolute path
 * @returns {number}
 */
function countLines(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    if (!content.trim()) return 0;
    return content.trim().split('\n').length;
  } catch {
    return 0;
  }
}

/**
 * Parse skill names from skills.log.
 * Lines are formatted as: [2024-01-15T10:30:00.000Z] skill_name
 * @param {string} content - full file content
 * @returns {string[]}
 */
function parseSkills(content) {
  if (!content.trim()) return [];
  return content
    .trim()
    .split('\n')
    .map((line) => {
      const match = line.match(/\]\s+(.+)$/);
      return match ? match[1].trim() : null;
    })
    .filter(Boolean);
}

/**
 * Get the last N lines from a string.
 * @param {string} content - full file content
 * @param {number} n - number of trailing lines to keep
 * @returns {string[]}
 */
function lastNLines(content, n) {
  if (!content.trim()) return [];
  const lines = content.trim().split('\n');
  return lines.slice(-n);
}

async function main() {
  try {
    // Read notification payload from stdin
    const raw = await readStdin();
    const payload = safeParseJson(raw);

    const sessionId = getSessionId();
    const shortId = getShortId(sessionId);
    const logDir = getSessionLogDir(sessionId);
    const timestamp = new Date().toISOString();

    // --- Build state snapshot ---

    // Skills currently loaded
    const skillsContent = safeReadFile(join(logDir, 'skills.log'));
    const skills = parseSkills(skillsContent);

    // Tool call count
    const toolCallCount = countLines(join(logDir, 'actions.jsonl'));

    // Last few prompts (up to 5)
    const promptsContent = safeReadFile(join(logDir, 'prompts.log'));
    const recentPrompts = lastNLines(promptsContent, 5);

    // Use a filesystem-safe timestamp for the filename (no colons)
    const fileSafeTimestamp = timestamp.replace(/:/g, '-').replace(/\./g, '-');

    const snapshot = {
      session_id: sessionId,
      short_id: shortId,
      snapshot_at: timestamp,
      trigger: payload || 'unknown',
      state: {
        skills_loaded: skills,
        tool_call_count: toolCallCount,
        recent_prompts: recentPrompts,
      },
    };

    const snapshotPath = join(logDir, `pre-compact-${fileSafeTimestamp}.json`);
    appendLog(snapshotPath, JSON.stringify(snapshot, null, 2) + '\n');

    process.stdout.write(`Pre-compact snapshot saved (${skills.length} skills, ${toolCallCount} tool calls)\n`);
  } catch {
    // Hooks must never block or crash. Swallow all errors.
  }
}

main().then(() => process.exit(0)).catch(() => process.exit(0));
