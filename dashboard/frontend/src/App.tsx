import { useState, useEffect, useCallback } from 'react';
import { api, type HealthResponse } from './api';
import SessionsPanel from './components/SessionsPanel';
import QueuePanel from './components/QueuePanel';
import AgentsPanel from './components/AgentsPanel';

type Tab = 'sessions' | 'queue' | 'agents';

function HealthDot({ status }: { status: string }) {
  const color =
    status === 'healthy'
      ? 'bg-emerald-400'
      : status === 'degraded'
        ? 'bg-amber-400'
        : 'bg-red-400';

  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} title={status} />
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('sessions');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await api.health();
      setHealth(data);
    } catch {
      setHealth(null);
    }
  }, []);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    fetchHealth();
    const interval = setInterval(() => {
      setRefreshKey((k) => k + 1);
      fetchHealth();
    }, 10_000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'sessions', label: 'Sessions', count: health?.counts?.active_sessions },
    { id: 'queue', label: 'Queue', count: health?.counts?.pending_tasks },
    { id: 'agents', label: 'Agents', count: health?.counts?.running_agents },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">
              Claude Code Dashboard
            </h1>
            <HealthDot status={health?.status ?? 'unhealthy'} />
          </div>

          <div className="flex items-center gap-4 text-xs text-zinc-500">
            {health && (
              <span>
                uptime {Math.floor(health.uptime / 60)}m
              </span>
            )}
            <span>auto-refresh 10s</span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-violet-400 text-violet-300'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                }`}
              >
                {t.label}
                {t.count != null && t.count > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-zinc-800 text-zinc-400">
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">
        {tab === 'sessions' && <SessionsPanel refreshKey={refreshKey} />}
        {tab === 'queue' && <QueuePanel refreshKey={refreshKey} />}
        {tab === 'agents' && <AgentsPanel refreshKey={refreshKey} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-3 text-center text-xs text-zinc-600">
        Claude Code Dashboard &mdash; Monitor sessions, queue tasks, and agents
      </footer>
    </div>
  );
}
