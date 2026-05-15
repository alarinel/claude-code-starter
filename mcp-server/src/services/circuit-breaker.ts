import CircuitBreaker from 'opossum';
import { createChildLogger } from './logger.js';

const log = createChildLogger('circuit-breaker');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CircuitBreakerOptions {
  /** Number of failures before opening the circuit. Default: 5. */
  errorThresholdPercentage?: number;
  /** Time (ms) before attempting a half-open probe. Default: 30000. */
  resetTimeout?: number;
  /** Request timeout (ms). Default: 10000. */
  timeout?: number;
  /** Minimum number of requests before tripping. Default: 5. */
  volumeThreshold?: number;
  /** Rolling stats window (ms). Default: 10000. */
  rollingCountTimeout?: number;
}

// ---------------------------------------------------------------------------
// Singleton registry
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registry = new Map<string, CircuitBreaker<any[], any>>();

/**
 * Create (or retrieve) a named circuit breaker.
 *
 * The registry prevents duplicate breakers for the same logical service.
 * If a breaker with the given `name` already exists it is returned as-is.
 *
 * @param name    - Unique identifier for this breaker (e.g. "external-api")
 * @param fn      - The async function to protect
 * @param options - Opossum configuration overrides
 *
 * @example
 * ```ts
 * const breaker = createCircuitBreaker('weather-api', fetchWeather, { timeout: 5000 });
 * const result = await breaker.fire('New York');
 * ```
 */
export function createCircuitBreaker<TArgs extends unknown[], TResult>(
  name: string,
  fn: (...args: TArgs) => Promise<TResult>,
  options: CircuitBreakerOptions = {},
): CircuitBreaker<TArgs, TResult> {
  const existing = registry.get(name);
  if (existing) {
    log.debug({ name }, 'returning existing circuit breaker');
    return existing as CircuitBreaker<TArgs, TResult>;
  }

  const breaker = new CircuitBreaker(fn, {
    name,
    errorThresholdPercentage: options.errorThresholdPercentage ?? 50,
    resetTimeout: options.resetTimeout ?? 30_000,
    timeout: options.timeout ?? 10_000,
    volumeThreshold: options.volumeThreshold ?? 5,
    rollingCountTimeout: options.rollingCountTimeout ?? 10_000,
  });

  // Lifecycle logging
  breaker.on('open', () => {
    log.warn({ name }, 'circuit breaker OPENED — requests will be short-circuited');
  });
  breaker.on('halfOpen', () => {
    log.info({ name }, 'circuit breaker HALF-OPEN — probing with next request');
  });
  breaker.on('close', () => {
    log.info({ name }, 'circuit breaker CLOSED — normal operation resumed');
  });
  breaker.on('fallback', () => {
    log.debug({ name }, 'circuit breaker fallback invoked');
  });

  registry.set(name, breaker);
  log.info({ name, resetTimeout: options.resetTimeout ?? 30_000 }, 'circuit breaker created');

  return breaker;
}

/**
 * Get a previously-created circuit breaker by name, or undefined.
 */
export function getCircuitBreaker<TArgs extends unknown[], TResult>(
  name: string,
): CircuitBreaker<TArgs, TResult> | undefined {
  return registry.get(name) as CircuitBreaker<TArgs, TResult> | undefined;
}

/**
 * Shut down all circuit breakers and clear the registry.
 */
export function destroyAllCircuitBreakers(): void {
  for (const [name, breaker] of registry) {
    breaker.shutdown();
    log.debug({ name }, 'circuit breaker shut down');
  }
  registry.clear();
}
