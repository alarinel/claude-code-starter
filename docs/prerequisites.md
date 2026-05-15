# Prerequisites

What you need installed before using this starter.

---

## Required (everything below)

| Dependency | Minimum | Purpose |
|------------|---------|---------|
| Node.js | 18.0+ | Hooks, MCP server, dashboard |
| Git | 2.30+ | Version control, session identity |
| Claude Code CLI | latest | The AI coding assistant itself |

## Optional — for the MCP server + dashboard

Install ONE of the following databases:
- **SQLite** (recommended for getting started) — already wired in via `better-sqlite3`. Zero install. Default in `mcp-server/.env.example`.
- **MySQL 8.0+**
- **PostgreSQL 14+**

Plus, if you want the MCP server's session state and real-time coordination features:
- **Redis 6+**

If you only want the CLAUDE.md template, hooks, skills, and agents, none of these are needed — the kit works fully without a database.

## Optional — for IntelliJ-powered code search

- **IntelliJ IDEA Community or Ultimate** (any 2025.3+)
- **LLITD Bridge Suite plugins** (see "Want More?" in the README)

---

## Install Instructions

### Node.js 18+

The hooks, MCP server, and dashboard are all Node.js applications. Version 18 is the minimum; version 22 LTS is recommended.

**macOS (Homebrew):**
```bash
brew install node@22
node --version
```

**macOS (nvm):**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
nvm install 22
nvm use 22
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Linux (Fedora/RHEL):**
```bash
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo dnf install -y nodejs
```

**Windows (winget):**
```powershell
winget install OpenJS.NodeJS.LTS
```

**Windows (installer):**
Download from https://nodejs.org/en/download/ and run the `.msi` installer. Ensure "Add to PATH" is checked.

### Git 2.30+

**macOS (Homebrew):**
```bash
brew install git
```

**macOS (Xcode CLI tools):**
```bash
xcode-select --install
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update && sudo apt-get install -y git
```

**Linux (Fedora/RHEL):**
```bash
sudo dnf install -y git
```

**Windows (winget):**
```powershell
winget install Git.Git
```

**Windows (installer):**
Download from https://git-scm.com/download/win and run the installer with defaults.

### Claude Code CLI

Follow the official installation instructions at https://docs.anthropic.com/claude-code/.

After installation:
```bash
claude --version
```

### MySQL (optional)

**macOS (Homebrew):**
```bash
brew install mysql && brew services start mysql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install -y mysql-server
sudo systemctl start mysql
```

**Linux (Fedora/RHEL):**
```bash
sudo dnf install -y mysql-server
sudo systemctl start mysqld
```

**Windows (winget):**
```powershell
winget install Oracle.MySQL
```

**Docker (any OS):**
```bash
docker run -d --name mysql -e MYSQL_ROOT_PASSWORD=secret -p 3306:3306 mysql:8
```

### PostgreSQL (optional, alternative to MySQL)

**macOS (Homebrew):**
```bash
brew install postgresql@16 && brew services start postgresql@16
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install -y postgresql
sudo systemctl start postgresql
```

**Docker:**
```bash
docker run -d --name postgres -e POSTGRES_PASSWORD=secret -p 5432:5432 postgres:16
```

### Redis 6+ (optional)

**macOS (Homebrew):**
```bash
brew install redis && brew services start redis
redis-cli ping   # Should print PONG
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install -y redis-server
sudo systemctl start redis-server
```

**Linux (Fedora/RHEL):**
```bash
sudo dnf install -y redis
sudo systemctl start redis
```

**Windows:**
Redis does not ship for native Windows. Options:

1. **WSL2 (recommended):**
   ```powershell
   wsl --install
   # Then inside WSL:
   sudo apt install redis-server
   sudo service redis-server start
   ```

2. **Docker:**
   ```powershell
   docker run -d --name redis -p 6379:6379 redis:7
   ```

### IntelliJ IDEA (optional)

Download from https://www.jetbrains.com/idea/download/. Community Edition (free) works for the Bridge Suite plugins.

---

## Verification Script

Use the bundled checker:

**macOS / Linux / Git Bash / WSL:**
```bash
bash check-prerequisites.sh           # core only
bash check-prerequisites.sh --full    # core + optional (DB, Redis)
```

**Windows PowerShell:**
```powershell
pwsh ./check-prerequisites.ps1            # core only
pwsh ./check-prerequisites.ps1 -Full      # core + optional (DB, Redis)
```

Both scripts exit non-zero on failure.
