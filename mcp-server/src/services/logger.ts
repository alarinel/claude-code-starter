import { AsyncLocalStorage } from 'node:async_hooks';
import pino from 'pino';

// ---------------------------------------------------------------------------
// Request context via AsyncLocalStorage
// ---------------------------------------------------------------------------

export interface RequestContext {
  correlation_id: string;
  session_id?: string;
}

const requestStore = new AsyncLocalStorage<RequestContext>();

/**
 * Run a function within a request context so that all log entries
 * automatically include `correlation_id` and `session_id`.
 */
export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return requestStore.run(ctx, fn);
}

/** Read the current request context (if any). */
export function getRequestContext(): RequestContext | undefined {
  return requestStore.getStore();
}

// ---------------------------------------------------------------------------
// Root logger
// ---------------------------------------------------------------------------

const level = (process.env['LOG_LEVEL'] ?? 'info').toLowerCase();

const rootLogger = pino({
  level,
  mixin() {
    const ctx = requestStore.getStore();
    if (!ctx) return {};
    const extra: Record<string, string> = { correlation_id: ctx.correlation_id };
    if (ctx.session_id) {
      extra['session_id'] = ctx.session_id;
    }
    return extra;
  },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export { rootLogger as logger };

/**
 * Create a child logger scoped to a specific service or subsystem.
 *
 * @example
 * ```ts
 * const log = createChildLogger('database');
 * log.info('connected');
 * // => { level: "info", service: "database", correlation_id: "...", msg: "connected" }
 * ```
 */
export function createChildLogger(service: string): pino.Logger {
  return rootLogger.child({ service });
}
