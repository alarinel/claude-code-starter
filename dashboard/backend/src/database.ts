import Knex from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'dashboard.db');

const db = Knex({
  client: 'better-sqlite3',
  connection: {
    filename: dbPath,
  },
  useNullAsDefault: true,
});

export async function initDatabase(): Promise<void> {
  const hasSessionsTable = await db.schema.hasTable('sessions');
  if (!hasSessionsTable) {
    await db.schema.createTable('sessions', (table) => {
      table.string('id').primary();
      table.string('short_id', 8).notNullable().index();
      table.timestamp('started_at').defaultTo(db.fn.now());
      table.timestamp('ended_at').nullable();
      table.string('status', 20).defaultTo('active').index();
      table.text('summary').nullable();
      table.integer('context_percent').defaultTo(0);
    });
    console.log('Created sessions table');
  }

  const hasQueueTable = await db.schema.hasTable('queue_tasks');
  if (!hasQueueTable) {
    await db.schema.createTable('queue_tasks', (table) => {
      table.increments('id').primary();
      table.string('type', 50).notNullable().index();
      table.string('status', 20).defaultTo('pending').index();
      table.integer('priority').defaultTo(0);
      table.string('title').notNullable();
      table.text('description').nullable();
      table.string('assigned_agent').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('completed_at').nullable();
      table.text('result_summary').nullable();
    });
    console.log('Created queue_tasks table');
  }

  const hasAgentsTable = await db.schema.hasTable('agents');
  if (!hasAgentsTable) {
    await db.schema.createTable('agents', (table) => {
      table.string('id').primary();
      table.string('session_id').nullable().references('id').inTable('sessions');
      table.string('status', 20).defaultTo('running').index();
      table.string('model', 50).nullable();
      table.string('task_type', 50).nullable();
      table.text('task_summary').nullable();
      table.timestamp('started_at').defaultTo(db.fn.now());
      table.timestamp('ended_at').nullable();
      table.integer('exit_code').nullable();
      table.text('log_output').nullable();
    });
    console.log('Created agents table');
  }
}

export default db;
