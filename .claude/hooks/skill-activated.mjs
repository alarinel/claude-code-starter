/**
 * claude-code-starter — Skill Activated Hook
 *
 * Event:   PreToolUse (fires when the Skill tool is about to be called)
 * Purpose: Track which skills have been activated in this session.
 *          Deduplicates entries so each skill appears at most once.
 */

import { join } from 'node:path';
import { readFileSync } from 'node:fs';
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

    // The Skill tool receives a skill name in different possible fields.
    const skillName =
      payload.skill ||
      (payload.parameters && payload.parameters.skill) ||
      (payload.input && payload.input.skill) ||
      null;

    if (!skillName) return;

    const sessionId = getSessionId();
    const logDir = getSessionLogDir(sessionId);
    const logPath = join(logDir, 'skills.log');

    // Deduplicate: read existing log and check if skill already recorded.
    let existing = '';
    try {
      existing = readFileSync(logPath, 'utf-8');
    } catch {
      // File doesn't exist yet — that's fine.
    }

    // Each line is formatted as "[timestamp] skill_name"
    // Check if this skill name already appears.
    const alreadyLogged = existing
      .split('\n')
      .some((line) => line.includes(`] ${skillName}`));

    if (!alreadyLogged) {
      const timestamp = new Date().toISOString();
      appendLog(logPath, `[${timestamp}] ${skillName}\n`);
    }
  } catch {
    // Swallow — hooks must never crash.
  }
}

main().then(() => process.exit(0)).catch(() => process.exit(0));
