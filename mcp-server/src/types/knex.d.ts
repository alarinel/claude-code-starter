/**
 * Augment knex ESM types to expose the Knex namespace that is available at
 * runtime but missing from the .d.mts declarations.
 *
 * The CJS types declare a top-level `Knex` namespace containing Config,
 * CreateTableBuilder, etc. The ESM .d.mts wrapper strips these via Omit.
 * This module augmentation restores access.
 */

/* eslint-disable @typescript-eslint/no-empty-interface */

// Pull the CJS types to get access to the Knex interface and namespace
import knexCjs = require('knex');

declare module 'knex' {
  // Re-export the Knex interface (the query builder instance type)
  export type Knex<TRecord extends {} = any, TResult = unknown[]> = knexCjs.Knex<TRecord, TResult>;

  // Re-export the Knex namespace (Config, CreateTableBuilder, etc.)
  export namespace Knex {
    export type Config = knexCjs.Knex.Config;
    export type CreateTableBuilder = knexCjs.Knex.CreateTableBuilder;
    export type TableBuilder = knexCjs.Knex.TableBuilder;
    export type SchemaBuilder = knexCjs.Knex.SchemaBuilder;
    export type ColumnBuilder = knexCjs.Knex.ColumnBuilder;
    export type QueryBuilder<TRecord extends {} = any, TResult = any> = knexCjs.Knex.QueryBuilder<TRecord, TResult>;
    export type Raw<TResult = any> = knexCjs.Knex.Raw<TResult>;
    export type Transaction<TRecord extends {} = any, TResult = any> = knexCjs.Knex.Transaction<TRecord, TResult>;
    export type FunctionHelper = knexCjs.Knex.FunctionHelper;
  }
}
