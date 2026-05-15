import { useState, useEffect } from 'react';
import { api, type Agent } from '../api';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const seconds = Math.floor((end - start) / 1000);

  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'running') {
    return (
      <span className="flex items-center justify-center w-5 h-5">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-status-pulse" />
      </span>
    );
  }
  if (status === 'completed') {
    return (
      <span className="flex items-center justify-center w-5 h-5 text-emerald-400" title="Completed">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="flex items-center justify-center w-5 h-5 text-red-400" title="Failed">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    );
  }
  return (
    <span className="flex items-center justify-center w-5 h-5">
      <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
    </span>
  );
}

interface Props {
  refreshKey: number;
}

export default function AgentsPanel({ refreshKey }: Props) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.agents.list().then((data) => {
      setAgents(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [refreshKey]);

  const handleSelect = async (id: string) => {
    if (selected?.id === id) {
      setSelected(null);
      return;
    }
    try {
      const detail = await api.agents.get(id);
      setSelected(detail);
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-zinc-900 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500">
        <p className="text-lg">No agents spawned yet</p>
        <p className="text-sm mt-1">Agents appear here when tasks are delegated to child processes</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
              <th className="pb-3 pr-4 font-medium w-8" />
              <th className="pb-3 pr-4 font-medium">ID</th>
              <th className="pb-3 pr-4 font-medium">Session</th>
              <th className="pb-3 pr-4 font-medium">Model</th>
              <th className="pb-3 pr-4 font-medium">Task</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 font-medium">Duration</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr
                key={a.id}
                onClick={() => handleSelect(a.id)}
                className={`border-b border-zinc-800/50 cursor-pointer transition-colors ${
                  selected?.id === a.id
                    ? 'bg-violet-950/20'
                    : 'hover:bg-zinc-900/50'
                }`}
              >
                <td className="py-3 pr-4">
                  <StatusIcon status={a.status} />
                </td>
                <td className="py-3 pr-4">
                  <code className="text-violet-300 bg-zinc-800 px-1.5 py-0.5 rounded text-xs">
                    {a.id.slice(0, 8)}
                  </code>
                </td>
                <td className="py-3 pr-4">
                  {a.session_id ? (
                    <code className="text-zinc-400 text-xs">{a.session_id.slice(0, 8)}</code>
                  ) : (
                    <span className="text-zinc-600 text-xs">standalone</span>
                  )}
                </td>
                <td className="py-3 pr-4 text-zinc-400 text-xs">
                  {a.model || <span className="text-zinc-600">unknown</span>}
                </td>
                <td className="py-3 pr-4 text-zinc-300 truncate max-w-xs">
                  {a.task_summary || <span className="text-zinc-600 italic">No description</span>}
                </td>
                <td className="py-3 pr-4">
                  <span className={`text-xs font-medium ${
                    a.status === 'running' ? 'text-blue-300' :
                    a.status === 'completed' ? 'text-emerald-300' :
                    a.status === 'failed' ? 'text-red-300' : 'text-zinc-400'
                  }`}>
                    {a.status}
                  </span>
                </td>
                <td className="py-3 text-zinc-500 tabular-nums text-xs">
                  {formatDuration(a.started_at, a.ended_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail panel with log output */}
      {selected && (
        <div className="mt-6 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-200">
              Agent <code className="text-violet-300">{selected.id.slice(0, 8)}</code>
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
              <dt className="text-zinc-500 text-xs">Full ID</dt>
              <dd className="text-zinc-300 font-mono text-xs break-all">{selected.id}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 text-xs">Model</dt>
              <dd className="text-zinc-300">{selected.model || 'unknown'}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 text-xs">Started</dt>
              <dd className="text-zinc-300">{formatTime(selected.started_at)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 text-xs">Exit Code</dt>
              <dd className={`font-mono ${
                selected.exit_code === 0 ? 'text-emerald-300' :
                selected.exit_code != null ? 'text-red-300' : 'text-zinc-500'
              }`}>
                {selected.exit_code ?? 'running'}
              </dd>
            </div>
          </dl>

          {selected.task_summary && (
            <div className="mb-4">
              <dt className="text-zinc-500 text-xs mb-1">Task</dt>
              <dd className="text-zinc-300 text-sm">{selected.task_summary}</dd>
            </div>
          )}

          {selected.log_output && (
            <div>
              <dt className="text-zinc-500 text-xs mb-1">Log Output</dt>
              <dd className="bg-zinc-950 border border-zinc-800 rounded p-3 font-mono text-xs text-zinc-400 max-h-64 overflow-y-auto whitespace-pre-wrap">
                {selected.log_output}
              </dd>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
