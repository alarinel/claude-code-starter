---
name: db-manager
description: Database health monitoring, performance analysis, and schema management
category: atomic
tools: [Bash, Read, Grep]
---

# DB Manager

## Purpose

Monitors database health, analyzes slow queries, recommends indexes, and reviews schema design. Use this skill for database performance issues, schema reviews, or routine health checks.

## Prerequisites

- Database connection credentials available
- Access to query logs or slow query log enabled
- Basic understanding of the project's schema layout

## Workflow

### 1. Health Check

```sql
-- Connection pool status
SHOW STATUS LIKE 'Threads_%';
SHOW STATUS LIKE 'Max_used_connections';

-- Current activity
SHOW PROCESSLIST;

-- Database sizes
SELECT table_schema, ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
FROM information_schema.tables GROUP BY table_schema ORDER BY size_mb DESC;
```

### 2. Slow Query Analysis

```sql
-- Find slow queries (MySQL)
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 20;

-- Or from performance_schema
SELECT digest_text, count_star, avg_timer_wait/1000000000 AS avg_ms
FROM performance_schema.events_statements_summary_by_digest
ORDER BY avg_timer_wait DESC LIMIT 20;
```

For each slow query: run `EXPLAIN` to understand the execution plan, check for missing indexes, and look for full table scans.

### 3. Index Recommendations

```sql
-- Tables without primary keys (red flag)
SELECT t.table_schema, t.table_name
FROM information_schema.tables t
LEFT JOIN information_schema.table_constraints c
  ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND c.constraint_type = 'PRIMARY KEY'
WHERE c.constraint_name IS NULL AND t.table_type = 'BASE TABLE';

-- Unused indexes (MySQL 8+)
SELECT * FROM sys.schema_unused_indexes;

-- Duplicate indexes
SELECT * FROM sys.schema_redundant_indexes;
```

**Index decision framework:**
- Column in WHERE clause of frequent queries? Add index.
- Column used in JOIN conditions? Add index.
- Low cardinality column (boolean, status enum)? Usually skip.
- Table under 1000 rows? Index won't matter.

### 4. Schema Review

Check for:
- Missing foreign keys where relationships clearly exist
- Columns with no NOT NULL constraint that should have one
- VARCHAR(255) used everywhere instead of appropriate sizes
- Missing created_at / updated_at timestamps
- Tables without indexes on commonly-filtered columns

## Examples

**Investigate a performance complaint:**
1. Check active connections and running queries
2. Find the slow queries from the last hour
3. EXPLAIN the worst offender
4. Recommend an index or query rewrite

**Pre-launch schema review:**
1. List all tables and their sizes
2. Check for missing primary keys
3. Review index coverage on frequently-queried tables
4. Flag any schema design concerns

## Gotchas

- **Never run DDL in production without a plan.** Adding an index on a large table can lock it for minutes. Use `ALTER TABLE ... ALGORITHM=INPLACE` where supported, or schedule during low traffic.
- **EXPLAIN results vary by data volume.** An index that helps with 1M rows might not be chosen by the optimizer on a 100-row dev table.
- **Don't over-index.** Every index slows down writes. Only add indexes that serve actual query patterns.
- **Connection pool exhaustion is usually a code bug.** Leaked connections (not returned to pool) are more common than needing a bigger pool.
- **Back up before schema changes.** Always.
