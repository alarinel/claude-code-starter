#!/usr/bin/env node
/**
 * Session Tracking Hook
 *
 * Logs every Claude Code session start to a local JSONL file.
 * Captures: session ID, timestamp, working directory, git branch.
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
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Read stdin (hook input from Claude Code) ──
function readStdin() {
  try {
    return readFileSync(0, 'utf-8').trim();
  } catch {
    return '';
  }
}

function safeParseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── Get git info ──
function getGitBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8', timeout: 3000 }).trim();
  } catch {
    return 'unknown';
  }
}

function getGitRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8', timeout: 3000 }).trim();
  } catch {
    return process.cwd();
  }
}

// ── Main ──
try {
  const raw = readStdin();
  const data = safeParseJson(raw);

  // Extract session info from hook input
  const sessionId = data?.session_id || `session-${Date.now()}`;
  const prompt = data?.prompt || '';

  // Build session record
  const record = {
    timestamp: new Date().toISOString(),
    sessionId,
    branch: getGitBranch(),
    cwd: process.cwd(),
    gitRoot: getGitRoot(),
    promptLength: prompt.length,
    promptPreview: prompt.substring(0, 100),
  };

  // Ensure logs directory exists
  const logDir = join(getGitRoot(), '.claude', 'logs');
  mkdirSync(logDir, { recursive: true });

  // Append to JSONL log
  const logFile = join(logDir, 'sessions.jsonl');
  appendFileSync(logFile, JSON.stringify(record) + '\n');

  // Output success (visible in hook output)
  console.log(`[SESSION] ${sessionId.substring(0, 8)}`);
} catch {
  // Hooks must NEVER crash — silent exit on any error
  process.exit(0);
}

process.exit(0);
