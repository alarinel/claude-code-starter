import { Redis } from 'ioredis';
import { createChildLogger } from './logger.js';

const log = createChildLogger('redis');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface RedisConfig {
  host: string;
  port: number;
  password: string | undefined;
  db: number;
}

function loadConfig(): RedisConfig {
  return {
    host: process.env['REDIS_HOST'] ?? '127.0.0.1',
    port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
    password: process.env['REDIS_PASSWORD'] || undefined,
    db: parseInt(process.env['REDIS_DB'] ?? '0', 10),
  };
}

// ---------------------------------------------------------------------------
// Redis service (lazy singleton)
// ---------------------------------------------------------------------------

let instance: Redis | null = null;

/**
 * Return the shared Redis instance, creating it on first call (lazy init).
 *
 * The connection is configured with `enableOfflineQueue: false` so that
 * commands fail immediately when the connection is down rather than
 * silently queuing.
 */
export function getRedis(): Redis {
  if (instance) return instance;

  const cfg = loadConfig();
  log.info({ host: cfg.host, port: cfg.port, db: cfg.db }, 'initializing Redis connection');

  instance = new Redis({
    host: cfg.host,
    port: cfg.port,
    password: cfg.password,
    db: cfg.db,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      const delay = Math.min(times * 200, 5000);
      log.warn({ attempt: times, delay_ms: delay }, 'redis reconnecting');
      return delay;
    },
    lazyConnect: true,
  });

  instance.on('connect', () => log.info('redis connected'));
  instance.on('ready', () => log.info('redis ready'));
  instance.on('error', (err: Error) => log.error({ err }, 'redis error'));
  instance.on('close', () => log.warn('redis connection closed'));

  return instance;
}

/**
 * Ensure the Redis connection is established. Call this before the first
 * command if you need an explicit connection step.
 */
export async function connectRedis(): Promise<void> {
  const redis = getRedis();
  if (redis.status === 'ready') return;
  await redis.connect();
}

/**
 * Check Redis connectivity. Returns true if PING succeeds.
 */
export async function isRedisHealthy(): Promise<boolean> {
  if (!instance) return false;
  try {
    const reply = await instance.ping();
    return reply === 'PONG';
  } catch {
    return false;
  }
}

/**
 * Gracefully disconnect Redis.
 */
export async function destroyRedis(): Promise<void> {
  if (!instance) return;
  log.info('disconnecting Redis');
  await instance.quit();
  instance = null;
}
