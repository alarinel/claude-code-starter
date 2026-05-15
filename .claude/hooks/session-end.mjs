/**
 * claude-code-starter — Session End Hook
 *
 * Event:   Stop (fires when the Claude Code session ends)
 * Purpose: Clean up session state and write a session summary.
 *          Calculates session duration from prompts.log first-line timestamp,
 *          counts tool calls from actions.jsonl, and lists activated skills
 *          from skills.log. Writes a JSON summary to the session logs directory.
 *
 * Input:   None (no stdin payload for Stop events)
 * Output:  "Session {short_id} ended" to stdout
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getSessionId,
  getShortId,
  getSessionLogDir,
  appendLog,
} from './lib/helpers.mjs';

/**
 * Count non-empty lines in a file. Returns 0 if the file does not exist.
 * @param {string} filePath - absolute path to the file
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
 * Extract the ISO timestamp from the first line of prompts.log.
 * Lines are formatted as: [2024-01-15T10:30:00.000Z] prompt text
 * @param {string} content - full file content
 * @returns {string|null} ISO timestamp or null
 */
function extractFirstTimestamp(content) {
  if (!content) return null;
  const firstLine = content.split('\n')[0] || '';
  const match = firstLine.match(/^\[([^\]]+)\]/);
  return match ? match[1] : null;
}

/**
 * Parse skill names from skills.log.
 * Lines are formatted as: [2024-01-15T10:30:00.000Z] skill_name
 * @param {string} content - full file content
 * @returns {string[]} list of skill names
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

async function main() {
  try {
    const sessionId = getSessionId();
    const shortId = getShortId(sessionId);
    const logDir = getSessionLogDir(sessionId);
    const endTime = new Date();

    // --- Gather session metrics ---

    // Duration: derive from first prompt timestamp
    const promptsContent = safeReadFile(join(logDir, 'prompts.log'));
    const startTimestamp = extractFirstTimestamp(promptsContent);

    let durationMs = null;
    let durationFormatted = 'unknown';
    if (startTimestamp) {
      const startDate = new Date(startTimestamp);
      if (!isNaN(startDate.getTime())) {
        durationMs = endTime.getTime() - startDate.getTime();
        const totalSeconds = Math.floor(durationMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        durationFormatted =
          hours > 0
            ? `${hours}h ${minutes}m ${seconds}s`
            : minutes > 0
              ? `${minutes}m ${seconds}s`
              : `${seconds}s`;
      }
    }

    // Tool call count from actions.jsonl
    const toolCallCount = countLines(join(logDir, 'actions.jsonl'));

    // Skills activated from skills.log
    const skillsContent = safeReadFile(join(logDir, 'skills.log'));
    const skills = parseSkills(skillsContent);

    // Prompt count from prompts.log
    const promptCount = countLines(join(logDir, 'prompts.log'));

    // --- Write session summary ---
    const summary = {
      session_id: sessionId,
      short_id: shortId,
      started_at: startTimestamp || null,
      ended_at: endTime.toISOString(),
      duration_ms: durationMs,
      duration: durationFormatted,
      prompt_count: promptCount,
      tool_call_count: toolCallCount,
      skills_activated: skills,
    };

    const summaryPath = join(logDir, 'session-summary.json');
    appendLog(summaryPath, JSON.stringify(summary, null, 2) + '\n');

    process.stdout.write(
      `Session ${shortId} ended (${durationFormatted}, ${toolCallCount} tool calls, ${skills.length} skills)\n`
    );
  } catch {
    // Hooks must never block or crash. Swallow all errors.
  }
}

main().then(() => process.exit(0)).catch(() => process.exit(0));
