#!/usr/bin/env bash
# =============================================================================
# claude-code-starter -- Prerequisite Checker
# =============================================================================
# Validates that required tools are installed and meet minimum versions.
# Run: bash check-prerequisites.sh [--full]
#
# Flags:
#   --full    Also check optional dependencies (MySQL/PostgreSQL, Redis) for the MCP server and dashboard
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Color output
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No color

pass() { echo -e "  ${GREEN}[PASS]${NC} $1"; }
fail() { echo -e "  ${RED}[FAIL]${NC} $1"; FAILURES=$((FAILURES + 1)); }
warn() { echo -e "  ${YELLOW}[WARN]${NC} $1"; }
info() { echo -e "  ${CYAN}[INFO]${NC} $1"; }

FAILURES=0
FULL_MODE=false

for arg in "$@"; do
  case "$arg" in
    --full) FULL_MODE=true ;;
  esac
done

echo ""
echo -e "${BOLD}claude-code-starter -- Prerequisite Check${NC}"
echo "==========================================="
echo ""

# ---------------------------------------------------------------------------
# Helper: compare semver (returns 0 if $1 >= $2)
# ---------------------------------------------------------------------------
version_gte() {
  local IFS=.
  local i ver1=($1) ver2=($2)
  for ((i=0; i<${#ver2[@]}; i++)); do
    local v1=${ver1[i]:-0}
    local v2=${ver2[i]:-0}
    if ((v1 > v2)); then return 0; fi
    if ((v1 < v2)); then return 1; fi
  done
  return 0
}

# ---------------------------------------------------------------------------
# Core: Node.js 18+
# ---------------------------------------------------------------------------
echo -e "${BOLD}Core Dependencies${NC}"
echo "---"

if command -v node &>/dev/null; then
  NODE_VERSION=$(node --version | sed 's/^v//')
  if version_gte "$NODE_VERSION" "18.0.0"; then
    pass "Node.js $NODE_VERSION (>= 18.0.0 required)"
  else
    fail "Node.js $NODE_VERSION found, but >= 18.0.0 is required"
  fi
else
  fail "Node.js not found. Install from https://nodejs.org/"
fi

# ---------------------------------------------------------------------------
# Core: npm
# ---------------------------------------------------------------------------
if command -v npm &>/dev/null; then
  NPM_VERSION=$(npm --version)
  pass "npm $NPM_VERSION"
else
  fail "npm not found. It should ship with Node.js."
fi

# ---------------------------------------------------------------------------
# Core: Git
# ---------------------------------------------------------------------------
if command -v git &>/dev/null; then
  GIT_VERSION=$(git --version | sed 's/git version //' | sed 's/ .*//')
  if version_gte "$GIT_VERSION" "2.30.0"; then
    pass "Git $GIT_VERSION (>= 2.30.0 required)"
  else
    warn "Git $GIT_VERSION found. >= 2.30.0 recommended for full feature support."
  fi
else
  fail "Git not found. Install from https://git-scm.com/"
fi

# ---------------------------------------------------------------------------
# Core: Claude Code CLI
# ---------------------------------------------------------------------------
if command -v claude &>/dev/null; then
  CLAUDE_VERSION=$(claude --version 2>/dev/null || echo "unknown")
  pass "Claude Code CLI ($CLAUDE_VERSION)"
else
  fail "Claude Code CLI not found. Install: npm install -g @anthropic-ai/claude-code"
fi

# ---------------------------------------------------------------------------
# Core: Anthropic API key
# ---------------------------------------------------------------------------
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  # Show first 8 and last 4 chars
  KEY_PREVIEW="${ANTHROPIC_API_KEY:0:8}...${ANTHROPIC_API_KEY: -4}"
  pass "ANTHROPIC_API_KEY is set ($KEY_PREVIEW)"
else
  warn "ANTHROPIC_API_KEY not set. Claude Code will prompt for authentication."
fi

echo ""

# ---------------------------------------------------------------------------
# Pro+ Tier: Database
# ---------------------------------------------------------------------------
if [ "$FULL_MODE" = true ]; then
  echo -e "${BOLD}Optional Dependencies (MCP server + dashboard)${NC}"
  echo "---"

  # MySQL
  if command -v mysql &>/dev/null; then
    MYSQL_VERSION=$(mysql --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo "unknown")
    pass "MySQL client $MYSQL_VERSION"
  elif command -v psql &>/dev/null; then
    PSQL_VERSION=$(psql --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' | head -1 || echo "unknown")
    pass "PostgreSQL client $PSQL_VERSION"
  else
    fail "No database client found. Install MySQL (mysql) or PostgreSQL (psql)."
  fi

  # MySQL/PostgreSQL server connectivity
  DB_HOST="${DB_HOST:-localhost}"
  DB_PORT="${DB_PORT:-3306}"
  if command -v mysql &>/dev/null; then
    if mysql -h "$DB_HOST" -P "$DB_PORT" -u "${DB_USER:-root}" -e "SELECT 1" &>/dev/null 2>&1; then
      pass "MySQL server reachable at $DB_HOST:$DB_PORT"
    else
      warn "MySQL server not reachable at $DB_HOST:$DB_PORT. Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD."
    fi
  elif command -v psql &>/dev/null; then
    DB_PORT="${DB_PORT:-5432}"
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "${DB_USER:-postgres}" -c "SELECT 1" &>/dev/null 2>&1; then
      pass "PostgreSQL server reachable at $DB_HOST:$DB_PORT"
    else
      warn "PostgreSQL server not reachable at $DB_HOST:$DB_PORT. Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD."
    fi
  fi

  # Redis
  if command -v redis-cli &>/dev/null; then
    REDIS_VERSION=$(redis-cli --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo "unknown")
    pass "Redis CLI $REDIS_VERSION"

    REDIS_HOST="${REDIS_HOST:-localhost}"
    REDIS_PORT="${REDIS_PORT:-6379}"
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>/dev/null | grep -q PONG; then
      pass "Redis server reachable at $REDIS_HOST:$REDIS_PORT"
    else
      warn "Redis server not reachable at $REDIS_HOST:$REDIS_PORT."
    fi
  else
    fail "Redis CLI not found. Install Redis: https://redis.io/download"
  fi

  echo ""
fi

# ---------------------------------------------------------------------------
# Optional: Helpful tools
# ---------------------------------------------------------------------------
echo -e "${BOLD}Optional Tools${NC}"
echo "---"

if command -v jq &>/dev/null; then
  pass "jq $(jq --version 2>/dev/null | sed 's/jq-//')"
else
  info "jq not found. Recommended for JSON processing. Install: https://jqlang.github.io/jq/"
fi

if command -v rg &>/dev/null; then
  pass "ripgrep $(rg --version | head -1 | sed 's/ripgrep //')"
else
  info "ripgrep not found. Recommended for fast search. Install: https://github.com/BurntSushi/ripgrep"
fi

if command -v fd &>/dev/null; then
  pass "fd $(fd --version | sed 's/fd //')"
else
  info "fd not found. Recommended for fast file finding. Install: https://github.com/sharkdp/fd"
fi

echo ""

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo "==========================================="
if [ $FAILURES -eq 0 ]; then
  echo -e "${GREEN}${BOLD}All checks passed.${NC} Your environment is ready."
else
  echo -e "${RED}${BOLD}$FAILURES check(s) failed.${NC} Fix the issues above before proceeding."
fi
echo ""

exit $FAILURES
