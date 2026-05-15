import { useState, useEffect } from 'react';
import { api, type QueueTask } from '../api';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-900/50 text-amber-300 border-amber-700/50',
  in_progress: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
  completed: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50',
  failed: 'bg-red-900/50 text-red-300 border-red-700/50',
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700/50';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${style}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function PriorityIndicator({ priority }: { priority: number }) {
  const bars = Math.min(Math.max(priority, 0), 5);
  return (
    <div className="flex gap-0.5 items-end h-4" title={`Priority ${priority}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`w-1 rounded-sm ${
            i < bars ? 'bg-violet-400' : 'bg-zinc-800'
          }`}
          style={{ height: `${4 + i * 3}px` }}
        />
      ))}
    </div>
  );
}

const FILTER_OPTIONS = ['all', 'pending', 'in_progress', 'completed', 'failed'] as const;

interface Props {
  refreshKey: number;
}

export default function QueuePanel({ refreshKey }: Props) {
  const [tasks, setTasks] = useState<QueueTask[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<QueueTask | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const statusParam = filter === 'all' ? undefined : filter;
    api.queue.list(statusParam).then((data) => {
      setTasks(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [refreshKey, filter]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-zinc-900 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex gap-2 mb-4">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => setFilter(opt)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              filter === opt
                ? 'bg-violet-900/50 text-violet-300 border border-violet-700/50'
                : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:text-zinc-300'
            }`}
          >
            {opt.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <p className="text-lg">No tasks in queue</p>
          <p className="text-sm mt-1">
            {filter !== 'all' ? 'Try a different filter' : 'Tasks will appear when work is queued'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                <th className="pb-3 pr-4 font-medium w-8">#</th>
                <th className="pb-3 pr-4 font-medium">Type</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium">Priority</th>
                <th className="pb-3 pr-4 font-medium">Title</th>
                <th className="pb-3 pr-4 font-medium">Agent</th>
                <th className="pb-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelected(selected?.id === t.id ? null : t)}
                  className={`border-b border-zinc-800/50 cursor-pointer transition-colors ${
                    selected?.id === t.id
                      ? 'bg-violet-950/20'
                      : 'hover:bg-zinc-900/50'
                  }`}
                >
                  <td className="py-3 pr-4 text-zinc-600 tabular-nums">{t.id}</td>
                  <td className="py-3 pr-4">
                    <span className="text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded text-xs">
                      {t.type}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="py-3 pr-4">
                    <PriorityIndicator priority={t.priority} />
                  </td>
                  <td className="py-3 pr-4 text-zinc-300 truncate max-w-xs">{t.title}</td>
                  <td className="py-3 pr-4">
                    {t.assigned_agent ? (
                      <code className="text-blue-300 text-xs">{t.assigned_agent.slice(0, 8)}</code>
                    ) : (
                      <span className="text-zinc-600 text-xs">unassigned</span>
                    )}
                  </td>
                  <td className="py-3 text-zinc-400 tabular-nums text-xs">
                    {formatTime(t.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div className="mt-6 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-200">
              Task #{selected.id}: {selected.title}
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
              <dt className="text-zinc-500 text-xs">Type</dt>
              <dd className="text-zinc-300">{selected.type}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 text-xs">Status</dt>
              <dd><StatusBadge status={selected.status} /></dd>
            </div>
            <div>
              <dt className="text-zinc-500 text-xs">Priority</dt>
              <dd className="text-zinc-300">{selected.priority}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 text-xs">Agent</dt>
              <dd className="text-zinc-300 font-mono text-xs">
                {selected.assigned_agent || 'unassigned'}
              </dd>
            </div>
          </dl>

          {selected.description && (
            <div className="mb-4">
              <dt className="text-zinc-500 text-xs mb-1">Description</dt>
              <dd className="text-zinc-300 text-sm whitespace-pre-wrap bg-zinc-800/50 p-3 rounded">
                {selected.description}
              </dd>
            </div>
          )}

          {selected.result_summary && (
            <div>
              <dt className="text-zinc-500 text-xs mb-1">Result</dt>
              <dd className="text-zinc-300 text-sm whitespace-pre-wrap bg-zinc-800/50 p-3 rounded">
                {selected.result_summary}
              </dd>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
