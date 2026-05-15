# =============================================================================
# claude-code-starter -- Prerequisite Checker (PowerShell)
# =============================================================================
# Validates that required tools are installed and meet minimum versions.
# Run: pwsh ./check-prerequisites.ps1 [-Full]
#      powershell ./check-prerequisites.ps1 [-Full]   (Windows PowerShell 5+)
#
# Flags:
#   -Full    Also check optional dependencies (database client, Redis CLI)
#            needed if you plan to run the MCP server or dashboard.
# =============================================================================

[CmdletBinding()]
param(
    [switch]$Full
)

$ErrorActionPreference = 'Continue'

# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------
$script:Failures = 0

function Write-Pass { param([string]$Msg) Write-Host "  [PASS] $Msg" -ForegroundColor Green }
function Write-Fail {
    param([string]$Msg)
    Write-Host "  [FAIL] $Msg" -ForegroundColor Red
    $script:Failures++
}
function Write-Warn { param([string]$Msg) Write-Host "  [WARN] $Msg" -ForegroundColor Yellow }
function Write-Info { param([string]$Msg) Write-Host "  [INFO] $Msg" -ForegroundColor Cyan }

function Test-Cmd {
    param([string]$Name)
    $null = Get-Command -Name $Name -ErrorAction SilentlyContinue
    return $?
}

function Compare-Version {
    param([string]$Have, [string]$Need)
    try {
        return ([version]$Have) -ge ([version]$Need)
    } catch {
        return $false
    }
}

function Test-Port {
    param([string]$ComputerName, [int]$Port, [int]$TimeoutMs = 1000)
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect($ComputerName, $Port, $null, $null)
        $waited = $async.AsyncWaitHandle.WaitOne($TimeoutMs)
        if (-not $waited) { return $false }
        $client.EndConnect($async)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "claude-code-starter -- Prerequisite Check" -ForegroundColor White
Write-Host "==========================================="
Write-Host ""

# ---------------------------------------------------------------------------
# Core Dependencies
# ---------------------------------------------------------------------------
Write-Host "Core Dependencies" -ForegroundColor White
Write-Host "---"

# Node.js
if (Test-Cmd 'node') {
    $nodeVer = (node --version 2>$null) -replace '^v', ''
    if (Compare-Version -Have $nodeVer -Need '18.0.0') {
        Write-Pass "Node.js $nodeVer (>= 18.0.0 required)"
    } else {
        Write-Fail "Node.js $nodeVer found, but >= 18.0.0 is required"
    }
} else {
    Write-Fail "Node.js not found. Install from https://nodejs.org/"
}

# npm
if (Test-Cmd 'npm') {
    $npmVer = (npm --version 2>$null)
    Write-Pass "npm $npmVer"
} else {
    Write-Fail "npm not found. It should ship with Node.js."
}

# Git
if (Test-Cmd 'git') {
    $gitRaw = (git --version 2>$null)
    if ($gitRaw -match '(\d+\.\d+\.\d+)') {
        $gitVer = $Matches[1]
        if (Compare-Version -Have $gitVer -Need '2.30.0') {
            Write-Pass "Git $gitVer (>= 2.30.0 required)"
        } else {
            Write-Warn "Git $gitVer found. >= 2.30.0 recommended for full feature support."
        }
    } else {
        Write-Warn "Git found but version could not be parsed."
    }
} else {
    Write-Fail "Git not found. Install from https://git-scm.com/"
}

# Claude Code CLI
if (Test-Cmd 'claude') {
    $claudeVer = (claude --version 2>$null)
    if (-not $claudeVer) { $claudeVer = 'unknown' }
    Write-Pass "Claude Code CLI ($claudeVer)"
} else {
    Write-Fail "Claude Code CLI not found. Install: npm install -g @anthropic-ai/claude-code"
}

# Anthropic API key
if ($env:ANTHROPIC_API_KEY) {
    $k = $env:ANTHROPIC_API_KEY
    $preview = if ($k.Length -ge 12) { "$($k.Substring(0,8))...$($k.Substring($k.Length - 4))" } else { '***' }
    Write-Pass "ANTHROPIC_API_KEY is set ($preview)"
} else {
    Write-Warn "ANTHROPIC_API_KEY not set. Claude Code will prompt for authentication."
}

Write-Host ""

# ---------------------------------------------------------------------------
# Optional Dependencies (with -Full)
# ---------------------------------------------------------------------------
if ($Full) {
    Write-Host "Optional Dependencies (MCP server + dashboard)" -ForegroundColor White
    Write-Host "---"

    # Database client
    $hasMysql = Test-Cmd 'mysql'
    $hasPsql  = Test-Cmd 'psql'

    if ($hasMysql) {
        $mysqlRaw = (mysql --version 2>$null)
        if ($mysqlRaw -match '(\d+\.\d+\.\d+)') {
            Write-Pass "MySQL client $($Matches[1])"
        } else {
            Write-Pass "MySQL client (version unknown)"
        }

        $dbHost = if ($env:DB_HOST) { $env:DB_HOST } else { 'localhost' }
        $dbPort = if ($env:DB_PORT) { [int]$env:DB_PORT } else { 3306 }
        if (Test-Port -ComputerName $dbHost -Port $dbPort) {
            Write-Pass "MySQL server reachable at ${dbHost}:${dbPort}"
        } else {
            Write-Warn "MySQL server not reachable at ${dbHost}:${dbPort}. Check DB_HOST/DB_PORT/credentials."
        }
    } elseif ($hasPsql) {
        $psqlRaw = (psql --version 2>$null)
        if ($psqlRaw -match '(\d+\.\d+)') {
            Write-Pass "PostgreSQL client $($Matches[1])"
        } else {
            Write-Pass "PostgreSQL client (version unknown)"
        }

        $dbHost = if ($env:DB_HOST) { $env:DB_HOST } else { 'localhost' }
        $dbPort = if ($env:DB_PORT) { [int]$env:DB_PORT } else { 5432 }
        if (Test-Port -ComputerName $dbHost -Port $dbPort) {
            Write-Pass "PostgreSQL server reachable at ${dbHost}:${dbPort}"
        } else {
            Write-Warn "PostgreSQL server not reachable at ${dbHost}:${dbPort}. Check DB_HOST/DB_PORT/credentials."
        }
    } else {
        Write-Info "No external DB client found. SQLite (the kit default) needs no client install."
    }

    # Redis
    if (Test-Cmd 'redis-cli') {
        $redisRaw = (redis-cli --version 2>$null)
        if ($redisRaw -match '(\d+\.\d+\.\d+)') {
            Write-Pass "Redis CLI $($Matches[1])"
        } else {
            Write-Pass "Redis CLI (version unknown)"
        }

        $redisHost = if ($env:REDIS_HOST) { $env:REDIS_HOST } else { 'localhost' }
        $redisPort = if ($env:REDIS_PORT) { [int]$env:REDIS_PORT } else { 6379 }
        if (Test-Port -ComputerName $redisHost -Port $redisPort) {
            try {
                $pong = (redis-cli -h $redisHost -p $redisPort ping 2>$null)
                if ($pong -eq 'PONG') {
                    Write-Pass "Redis server reachable at ${redisHost}:${redisPort}"
                } else {
                    Write-Warn "Port open at ${redisHost}:${redisPort} but did not respond with PONG."
                }
            } catch {
                Write-Warn "Redis port open but ping failed."
            }
        } else {
            Write-Warn "Redis server not reachable at ${redisHost}:${redisPort}."
        }
    } else {
        Write-Warn "Redis CLI not found. Install Redis: https://redis.io/download (or run via Docker / WSL on Windows)"
    }

    Write-Host ""
}

# ---------------------------------------------------------------------------
# Optional helpful tools
# ---------------------------------------------------------------------------
Write-Host "Optional Tools" -ForegroundColor White
Write-Host "---"

if (Test-Cmd 'jq') {
    $jqRaw = (jq --version 2>$null) -replace '^jq-', ''
    Write-Pass "jq $jqRaw"
} else {
    Write-Info "jq not found. Recommended for JSON processing. Install: https://jqlang.github.io/jq/"
}

if (Test-Cmd 'rg') {
    $rgRaw = (rg --version 2>$null | Select-Object -First 1) -replace '^ripgrep ', ''
    Write-Pass "ripgrep $rgRaw"
} else {
    Write-Info "ripgrep not found. Recommended for fast search. Install: https://github.com/BurntSushi/ripgrep"
}

if (Test-Cmd 'fd') {
    $fdRaw = (fd --version 2>$null) -replace '^fd ', ''
    Write-Pass "fd $fdRaw"
} else {
    Write-Info "fd not found. Recommended for fast file finding. Install: https://github.com/sharkdp/fd"
}

Write-Host ""

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
Write-Host "==========================================="
if ($script:Failures -eq 0) {
    Write-Host "All checks passed." -ForegroundColor Green -NoNewline
    Write-Host " Your environment is ready."
} else {
    Write-Host "$($script:Failures) check(s) failed." -ForegroundColor Red -NoNewline
    Write-Host " Fix the issues above before proceeding."
}
Write-Host ""

exit $script:Failures
