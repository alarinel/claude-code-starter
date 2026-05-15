import knex, { type Knex } from 'knex';
import { createChildLogger } from './logger.js';

const log = createChildLogger('database');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface DatabaseConfig {
  client: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  poolMin: number;
  poolMax: number;
}

function loadConfig(): DatabaseConfig {
  return {
    client: process.env['DB_CLIENT'] ?? 'mysql2',
    host: process.env['DB_HOST'] ?? '127.0.0.1',
    port: parseInt(process.env['DB_PORT'] ?? '3306', 10),
    user: process.env['DB_USER'] ?? 'root',
    password: process.env['DB_PASSWORD'] ?? '',
    database: process.env['DB_NAME'] ?? 'app',
    poolMin: parseInt(process.env['DB_POOL_MIN'] ?? '2', 10),
    poolMax: parseInt(process.env['DB_POOL_MAX'] ?? '10', 10),
  };
}

// ---------------------------------------------------------------------------
// Database service (lazy singleton)
// ---------------------------------------------------------------------------

// Re-export the Knex type for consumers
export type { Knex as Knex };

let instance: Knex | null = null;

/**
 * Return the shared Knex instance, creating it on first call (lazy init).
 * Subsequent calls return the same instance.
 */
export function getDatabase(): Knex {
  if (instance) return instance;

  const cfg = loadConfig();
  log.info({ client: cfg.client, host: cfg.host, port: cfg.port, database: cfg.database }, 'initializing database connection');

  instance = (knex as unknown as (config: Knex.Config) => Knex)({
    client: cfg.client,
    connection: {
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
    },
    pool: {
      min: cfg.poolMin,
      max: cfg.poolMax,
    },
  });

  return instance;
}

/**
 * Check database connectivity. Returns true if a simple query succeeds.
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  if (!instance) return false;
  try {
    await instance.raw('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/**
 * Run a raw SQL query with optional parameter bindings and schema.
 *
 * @param sql    - SQL statement (parameterized with `?` placeholders)
 * @param params - Bind parameters
 * @param schema - Optional schema/database to scope the query to
 */
export async function executeQuery(
  sql: string,
  params: unknown[] = [],
  schema?: string,
): Promise<{ rows: unknown[]; rowCount: number }> {
  const db = getDatabase();

  // If a schema is specified, prefix the SQL with a USE statement for MySQL
  // or set search_path for PostgreSQL. For raw queries, withSchema() doesn't
  // apply, so we prepend the schema context manually.
  let effectiveSql = sql;
  if (schema) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
      throw new Error(`Invalid schema name: ${schema}`);
    }
    const client = (db.client as { config?: { client?: string } }).config?.client ?? '';
    if (client === 'pg') {
      effectiveSql = `SET search_path TO ${schema}; ${sql}`;
    } else {
      effectiveSql = sql; // MySQL: schema is typically the database itself
    }
  }

  const result = await db.raw(effectiveSql, params as readonly (string | number | boolean | null | Date | Buffer)[]);

  // Knex raw() returns different shapes depending on the driver:
  //   mysql2  -> [rows, fields]
  //   pg      -> { rows, rowCount }
  //   sqlite3 -> array of rows
  let rows: unknown[];
  let rowCount: number;

  if (Array.isArray(result)) {
    // mysql2 driver returns [rows, fields]
    rows = Array.isArray(result[0]) ? (result[0] as unknown[]) : [result[0]];
    rowCount = rows.length;
  } else if (result && typeof result === 'object' && 'rows' in result) {
    // pg driver
    const pgResult = result as { rows: unknown[]; rowCount: number };
    rows = pgResult.rows;
    rowCount = pgResult.rowCount;
  } else {
    rows = Array.isArray(result) ? result : [];
    rowCount = rows.length;
  }

  return { rows, rowCount };
}

/**
 * Gracefully destroy the database connection pool.
 */
export async function destroyDatabase(): Promise<void> {
  if (!instance) return;
  log.info('destroying database connection pool');
  await instance.destroy();
  instance = null;
}
