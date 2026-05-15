// API client for the dashboard backend

const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

// Types

export interface Session {
  id: string;
  short_id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  summary: string | null;
  context_percent: number;
}

export interface SessionDetail extends Session {
  agents: Agent[];
}

export interface QueueTask {
  id: number;
  type: string;
  status: string;
  priority: number;
  title: string;
  description: string | null;
  assigned_agent: string | null;
  created_at: string;
  completed_at: string | null;
  result_summary: string | null;
}

export interface Agent {
  id: string;
  session_id: string | null;
  status: string;
  model: string | null;
  task_type: string | null;
  task_summary: string | null;
  started_at: string;
  ended_at: string | null;
  exit_code: number | null;
  log_output?: string | null;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  checks: Record<string, { status: string; latency_ms: number }>;
  counts: {
    active_sessions: number;
    pending_tasks: number;
    running_agents: number;
  } | null;
}

// API calls

export const api = {
  health: () => request<HealthResponse>('/health'),

  sessions: {
    list: () => request<Session[]>('/sessions'),
    get: (id: string) => request<SessionDetail>(`/sessions/${id}`),
  },

  queue: {
    list: (status?: string) =>
      request<QueueTask[]>(`/queue${status ? `?status=${encodeURIComponent(status)}` : ''}`),
    get: (id: number) => request<QueueTask>(`/queue/${id}`),
    update: (id: number, data: Partial<QueueTask>) =>
      request<QueueTask>(`/queue/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  agents: {
    list: () => request<Agent[]>('/agents'),
    get: (id: string) => request<Agent>(`/agents/${id}`),
  },
};
