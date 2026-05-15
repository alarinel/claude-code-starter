import { useState, useEffect } from 'react';
import { api, type Session, type SessionDetail } from '../api';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50',
    ended: 'bg-zinc-800 text-zinc-400 border-zinc-700/50',
    error: 'bg-red-900/50 text-red-300 border-red-700/50',
  };
  const style = styles[status] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700/50';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${style}`}>
      {status}
    </span>
  );
}

function ContextBar({ percent }: { percent: number }) {
  const color =
    percent >= 80
      ? 'bg-red-400'
      : percent >= 60
        ? 'bg-amber-400'
        : 'bg-emerald-400';

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className="text-xs text-zinc-500 tabular-nums">{percent}%</span>
    </div>
  );
}

interface Props {
  refreshKey: number;
}

export default function SessionsPanel({ refreshKey }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.sessions.list().then((data) => {
      setSessions(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [refreshKey]);

  const handleSelect = async (id: string) => {
    if (selected?.id === id) {
      setSelected(null);
      return;
    }
    try {
      const detail = await api.sessions.get(id);
      setSelected(detail);
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return <TableSkeleton />;
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500">
        <p className="text-lg">No sessions recorded yet</p>
        <p className="text-sm mt-1">Sessions will appear here when Claude Code connects</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
              <th className="pb-3 pr-4 font-medium">Short ID</th>
              <th className="pb-3 pr-4 font-medium">Started</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 pr-4 font-medium">Context</th>
              <th className="pb-3 font-medium">Summary</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr
                key={s.id}
                onClick={() => handleSelect(s.id)}
                className={`border-b border-zinc-800/50 cursor-pointer transition-colors ${
                  selected?.id === s.id
                    ? 'bg-violet-950/20'
                    : 'hover:bg-zinc-900/50'
                }`}
              >
                <td className="py-3 pr-4">
                  <code className="text-violet-300 bg-zinc-800 px-1.5 py-0.5 rounded text-xs">
                    {s.short_id}
                  </code>
                </td>
                <td className="py-3 pr-4 text-zinc-400 tabular-nums">
                  {formatTime(s.started_at)}
                </td>
                <td className="py-3 pr-4">
                  <StatusBadge status={s.status} />
                </td>
                <td className="py-3 pr-4">
                  <ContextBar percent={s.context_percent} />
                </td>
                <td className="py-3 text-zinc-400 truncate max-w-xs">
                  {s.summary || <span className="text-zinc-600 italic">No summary</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="mt-6 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-200">
              Session <code className="text-violet-300">{selected.short_id}</code>
            </h3>
            <button
              onClick={() => setSelected(null)}
              className="text-zinc-500 hover:text-zinc-300 text-xs"
            >
              Close
            </button>
          </div>

          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div>
              <dt className="text-zinc-500 text-xs">ID</dt>
              <dd className="text-zinc-300 font-mono text-xs break-all">{selected.id}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 text-xs">Status</dt>
              <dd><StatusBadge status={selected.status} /></dd>
            </div>
            <div>
              <dt className="text-zinc-500 text-xs">Started</dt>
              <dd className="text-zinc-300">{formatTime(selected.started_at)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 text-xs">Context</dt>
              <dd><ContextBar percent={selected.context_percent} /></dd>
            </div>
          </dl>

          {selected.summary && (
            <div className="mb-4">
              <dt className="text-zinc-500 text-xs mb-1">Summary</dt>
              <dd className="text-zinc-300 text-sm">{selected.summary}</dd>
            </div>
          )}

          {selected.agents.length > 0 && (
            <div>
              <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                Agents ({selected.agents.length})
              </h4>
              <div className="space-y-2">
                {selected.agents.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-4 text-xs bg-zinc-800/50 px-3 py-2 rounded"
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      a.status === 'running' ? 'bg-blue-400 animate-status-pulse' :
                      a.status === 'completed' ? 'bg-emerald-400' : 'bg-red-400'
                    }`} />
                    <span className="text-zinc-300 font-mono">{a.id.slice(0, 8)}</span>
                    <span className="text-zinc-500">{a.model}</span>
                    <span className="text-zinc-400 flex-1 truncate">{a.task_summary}</span>
                    <span className="text-zinc-500">{a.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 bg-zinc-900 rounded animate-pulse" />
      ))}
    </div>
  );
}
