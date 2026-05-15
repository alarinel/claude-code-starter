/**
 * claude-code-starter — Shared Hook Helpers
 *
 * File-based utilities for session management, logging, and path resolution.
 * No external dependencies required.
 */

import { execSync } from 'node:child_process';
import { mkdirSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Find the git repository root directory.
 * Falls back to cwd if not inside a git repo.
 */
export function getProjectRoot() {
  try {
    const root = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    // Normalize Windows paths (backslash -> forward slash)
    return root.replace(/\/g, '/');
  } catch {
    return process.cwd().replace(/\/g, '/');
  }
}

/**
 * Get the current session ID from the environment.
 * Falls back to generating a timestamp-based UUID if not set.
 */
export function getSessionId() {
  if (process.env.CLAUDE_SESSION_ID) {
    return process.env.CLAUDE_SESSION_ID;
  }
  // Generate a fallback and cache it so repeated calls within a
  // process produce the same ID.
  if (!getSessionId._cached) {
    getSessionId._cached = randomUUID();
  }
  return getSessionId._cached;
}

/**
 * Extract the first 8 hex-safe characters from a session ID.
 */
export function getShortId(sessionId) {
  // Strip hyphens then take 8 chars — works with UUIDs and arbitrary strings.
  return (sessionId || '').replace(/-/g, '').slice(0, 8).toLowerCase();
}

/**
 * Create a directory and all parent directories (mkdir -p equivalent).
 * Silently succeeds if the directory already exists.
 */
export function ensureDir(dirPath) {
  try {
    mkdirSync(dirPath, { recursive: true });
  } catch (err) {
    // EEXIST is fine; anything else is unexpected but we never crash.
    if (err.code !== 'EEXIST') {
      // Swallow — hooks must not fail.
    }
  }
}

/**
 * Atomically append content to a file, creating parent directories as needed.
 * @param {string} filePath — absolute or relative path
 * @param {string} content  — text to append (newline NOT added automatically)
 */
export function appendLog(filePath, content) {
  try {
    const dir = resolve(filePath, '..');
    ensureDir(dir);
    appendFileSync(filePath, content, 'utf-8');
  } catch {
    // Swallow — hooks must never block or crash.
  }
}

/**
 * Read all of stdin as a UTF-8 string. Hooks receive JSON via stdin.
 * Returns an empty string if stdin is not available or reading fails.
 */
export async function readStdin() {
  return new Promise((resolvePromise) => {
    const chunks = [];
    const timeout = setTimeout(() => resolvePromise(''), 3000);

    process.stdin.resume();
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => {
      clearTimeout(timeout);
      resolvePromise(chunks.join(''));
    });
    process.stdin.on('error', () => {
      clearTimeout(timeout);
      resolvePromise('');
    });

    // If stdin is already ended (piped empty), 'end' fires immediately.
    if (process.stdin.readableEnded) {
      clearTimeout(timeout);
      resolvePromise('');
    }
  });
}

/**
 * Safely parse JSON, returning null on failure.
 */
export function safeParseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Build the path to the session's temp/logs directory.
 */
export function getSessionLogDir(sessionId) {
  const root = getProjectRoot();
  return `${root}/temp/${sessionId || getSessionId()}/logs`;
}
