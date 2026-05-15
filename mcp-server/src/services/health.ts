import { isDatabaseHealthy } from './database.js';
import { isRedisHealthy } from './redis.js';
import { createChildLogger } from './logger.js';

const log = createChildLogger('health');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unchecked';

export interface ServiceHealthResult {
  name: string;
  status: ServiceStatus;
  latency_ms: number;
  error?: string;
}

export interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceHealthResult[];
  checked_at: string;
  total_latency_ms: number;
}

/** A pluggable health check function. Return true = healthy. */
export type HealthCheckFn = () => Promise<boolean>;

// ---------------------------------------------------------------------------
// Registry for custom health checks
// ---------------------------------------------------------------------------

const customChecks = new Map<string, HealthCheckFn>();

/**
 * Register a custom health check that will be included in every health report.
 *
 * @param name - Unique name for this service
 * @param fn   - Async function returning true (healthy) or false (unhealthy)
 */
export function registerHealthCheck(name: string, fn: HealthCheckFn): void {
  customChecks.set(name, fn);
}

// ---------------------------------------------------------------------------
// Health check execution
// ---------------------------------------------------------------------------

const TIMEOUT_MS = 5_000;

async function checkService(name: string, fn: HealthCheckFn): Promise<ServiceHealthResult> {
  const start = performance.now();
  try {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const healthy = await Promise.race([
      fn().finally(() => { if (timer) clearTimeout(timer); }),
      new Promise<boolean>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS);
      }),
    ]);
    const latency_ms = Math.round(performance.now() - start);
    return {
      name,
      status: healthy ? 'healthy' : 'unhealthy',
      latency_ms,
    };
  } catch (err) {
    const latency_ms = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : String(err);
    return {
      name,
      status: 'unhealthy',
      latency_ms,
      error: message,
    };
  }
}

/**
 * Run all registered health checks (DB, Redis, plus custom) and return
 * an aggregate report.
 *
 * - **healthy**: all services healthy
 * - **degraded**: at least one unhealthy, but core services still up
 * - **unhealthy**: all services unhealthy or critical services down
 */
export async function getHealthReport(): Promise<HealthReport> {
  const start = performance.now();

  // Built-in checks
  const checks: Promise<ServiceHealthResult>[] = [
    checkService('database', isDatabaseHealthy),
    checkService('redis', isRedisHealthy),
  ];

  // Custom checks
  for (const [name, fn] of customChecks) {
    checks.push(checkService(name, fn));
  }

  const services = await Promise.all(checks);
  const total_latency_ms = Math.round(performance.now() - start);

  const unhealthyCount = services.filter((s) => s.status === 'unhealthy').length;
  let status: HealthReport['status'];
  if (unhealthyCount === 0) {
    status = 'healthy';
  } else if (unhealthyCount === services.length) {
    status = 'unhealthy';
  } else {
    status = 'degraded';
  }

  const report: HealthReport = {
    status,
    services,
    checked_at: new Date().toISOString(),
    total_latency_ms,
  };

  log.info({ status, total_latency_ms, services: services.map((s) => `${s.name}:${s.status}`) }, 'health check completed');

  return report;
}
