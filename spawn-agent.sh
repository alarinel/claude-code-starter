#!/usr/bin/env bash
# spawn-agent.sh - Launch a Claude Code agent with this starter's agent context injected
#
# Usage:
#   ./spawn-agent.sh "task prompt" [model] [effort]
#
# Arguments:
#   $1  Task prompt (required) - what the agent should do
#   $2  Model (optional) - claude model to use (default: sonnet)
#   $3  Effort level (optional) - low|medium|high (default: medium)
#
# Environment:
#   SESSION_ID - parent session ID (optional; auto-generated if missing)
#
# Notes:
#   - This runs claude in INTERACTIVE mode (foreground), inheriting your TTY.
#   - The agent context is injected via --append-system-prompt-file so the
#     spawned session knows it is an agent (not a top-level user session).
#   - For headless / programmatic spawning, see Anthropic's API docs. Per
#     Anthropic's policy, `claude --print` (headless / Agent SDK use) requires
#     API billing rather than the standard Claude Code subscription — this
#     script intentionally uses interactive mode so it runs under any plan.
#   - For multi-agent orchestration with terminal coordination across IDE
#     sessions, see the LLITD Bridge Suite at:
#         https://plugins.jetbrains.com/search?search=llitd
#     (Terminal Bridge, Project Intelligence Bridge, Run Configuration Bridge,
#      Notification Bridge — plus the open-source `bridge-suite-mcp` on npm.)
#
# Examples:
#   ./spawn-agent.sh "Review src/auth for security issues"
#   ./spawn-agent.sh "Refactor database connection pool" opus high
#   ./spawn-agent.sh "Clean up unused imports" haiku low

set -euo pipefail
IFS=$'\n\t'

# --- Help ---
if [[ "${1:-}" =~ ^(-h|--help)$ ]]; then
  sed -n '2,32p' "$0"
  exit 0
fi

# --- Arguments ---
if [[ $# -lt 1 ]]; then
  echo "Usage: spawn-agent.sh \"task prompt\" [model] [effort]" >&2
  echo "       model:  haiku | sonnet | opus  (default: sonnet)" >&2
  echo "       effort: low | medium | high     (default: medium)" >&2
  echo "Run with --help for full documentation." >&2
  exit 2
fi

PROMPT="$1"
MODEL="${2:-sonnet}"
EFFORT="${3:-medium}"

# --- Validate model + effort (warn, do not block) ---
case "$MODEL" in
  haiku|sonnet|opus) ;;
  *) echo "Warning: unrecognized model '$MODEL' (expected haiku|sonnet|opus). Passing through anyway." >&2 ;;
esac
case "$EFFORT" in
  low|medium|high) ;;
  *) echo "Warning: unrecognized effort '$EFFORT' (expected low|medium|high). Treating as medium." >&2; EFFORT="medium" ;;
esac

# --- Session ID ---
SESSION_ID="${SESSION_ID:-$(uuidgen 2>/dev/null || python3 -c 'import uuid; print(uuid.uuid4())' 2>/dev/null || python -c 'import uuid; print(uuid.uuid4())' 2>/dev/null || echo "session-$$")}"

# --- Paths ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_CONTEXT="${SCRIPT_DIR}/.claude/prompts/agent-context.md"

# --- Validate ---
if [[ ! -f "$AGENT_CONTEXT" ]]; then
  echo "ERROR: agent-context.md not found at ${AGENT_CONTEXT}" >&2
  echo "       Expected the kit's .claude/prompts/agent-context.md to exist." >&2
  exit 1
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "ERROR: claude CLI not found on PATH." >&2
  echo "       Install Claude Code: https://docs.anthropic.com/claude-code/" >&2
  exit 1
fi

# --- Effort prefix ---
EFFORT_PREFIX=""
if [[ "$EFFORT" == "high" ]]; then
  EFFORT_PREFIX="ultrathink "
fi

# --- Build full prompt ---
FULL_PROMPT="${EFFORT_PREFIX}${PROMPT}"

# --- Export session ID so the spawned claude (and hooks) can read it via env ---
export SESSION_ID

echo "Spawning Claude agent in interactive mode"
echo "  Model:   ${MODEL}"
echo "  Effort:  ${EFFORT}"
echo "  Context: ${AGENT_CONTEXT}"
echo ""

# --- Launch claude in interactive mode ---
# We use --append-system-prompt-file so the file content stays out of argv
# (Windows CreateProcessW has a ~32KB command-line limit, and agent context
# files can be sizeable). claude reads the file at startup.
exec claude \
  --model "$MODEL" \
  --append-system-prompt-file "$AGENT_CONTEXT" \
  "$FULL_PROMPT"
