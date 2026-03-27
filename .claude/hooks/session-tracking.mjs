#!/usr/bin/env node
/**
 * Session Tracking Hook
 *
 * Logs every Claude Code prompt to a local JSONL file.
 * Captures: timestamp, working directory, git branch, prompt preview.
 *
 * Register in .claude/settings.json:
 * {
 *   "hooks": {
 *     "UserPromptSubmit": [{
 *       "type": "command",
 *       "command": "node .claude/hooks/session-tracking.mjs"
 *     }]
 *   }
 * }
 */

import { readFileSync, appendFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

function readStdin() {
  try { return readFileSync(0, 'utf-8').trim(); } catch { return ''; }
}

function getGitBranch() {
  try { return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8', timeout: 3000 }).trim(); } catch { return 'unknown'; }
}

function getGitRoot() {
  try { return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8', timeout: 3000 }).trim(); } catch { return process.cwd(); }
}

try {
  let data = null;
  try { data = JSON.parse(readStdin()); } catch { /* no input */ }

  const record = {
    timestamp: new Date().toISOString(),
    branch: getGitBranch(),
    cwd: process.cwd(),
    promptLength: data?.prompt?.length || 0,
    promptPreview: (data?.prompt || '').substring(0, 80),
  };

  const logDir = join(getGitRoot(), '.claude', 'logs');
  mkdirSync(logDir, { recursive: true });
  appendFileSync(join(logDir, 'sessions.jsonl'), JSON.stringify(record) + '\n');
} catch {
  // Hooks must NEVER crash
}

process.exit(0);
