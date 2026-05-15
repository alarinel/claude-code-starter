# Claude Code Dashboard

A minimal monitoring dashboard for Claude Code sessions, agents, and queue tasks. Provides real-time visibility into what your Claude Code instances are doing.

## Architecture

- **Backend**: Node.js + Express + TypeScript + Knex (SQLite by default)
- **Frontend**: React 19 + Vite + Tailwind CSS 4
- **Database**: SQLite (zero-config) with auto-created tables on first run

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The backend starts on `http://localhost:5001` and creates `dashboard.db` automatically.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on `http://localhost:5173` and proxies API calls to the backend.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Dashboard health, uptime, aggregate counts |
| GET | `/api/sessions` | List sessions (most recent first) |
| GET | `/api/sessions/:id` | Session detail with associated agents |
| GET | `/api/queue` | List queue tasks (filterable by `?status=`) |
| GET | `/api/queue/:id` | Queue task detail |
| PATCH | `/api/queue/:id` | Update task status/assignment |
| GET | `/api/agents` | List agents (most recent first) |
| GET | `/api/agents/:id` | Agent detail with log output |

## Dashboard Panels

### Sessions
Shows all Claude Code sessions with short ID, start time, status, context window usage (as a progress bar), and summary. Click a row to expand and see associated agents.

### Queue
Displays queued tasks with type, status badges (pending/in-progress/completed/failed), priority bars, assigned agent, and creation time. Filter buttons let you narrow by status.

### Agents
Lists spawned agents with status indicators (pulsing dot for running, checkmark for completed, X for failed), model, task summary, and duration. Click to see full log output.

## Connecting to Your MCP Server

The dashboard reads from its own SQLite database by default. To connect it to your MCP server's database:

1. Update `backend/src/database.ts` to use your database connection (MySQL, PostgreSQL, etc.)
2. Adjust the table names and columns to match your schema
3. Or write a sync script that copies data from your MCP database into the dashboard's SQLite

## Configuration

### Backend (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5001` | Express server port |
| `DB_PATH` | `./dashboard.db` | SQLite database file path |

### Frontend (vite.config.ts)

The dev server proxies `/api` requests to `http://localhost:5001`. Update the proxy target if your backend runs on a different port.

## Building for Production

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Serve dist/ with any static file server
```

## Customization

- **Theme**: Edit `frontend/src/app.css` CSS custom properties and Tailwind classes
- **Refresh interval**: Change the `10_000` value in `App.tsx`
- **Database**: Swap SQLite for MySQL/PostgreSQL by changing the Knex client in `database.ts`
- **Additional panels**: Add new route files in `backend/src/routes/` and components in `frontend/src/components/`
