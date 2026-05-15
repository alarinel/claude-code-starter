# Backend Coding Standards

Applies to server-side code: Java, Python, Go, Kotlin, Rust, or any backend language.

## Architecture

- Follow a layered architecture: Controller/Handler -> Service -> Repository/DAO.
- Controllers handle HTTP concerns only: request parsing, response formatting, status codes.
- Services contain business logic. They never import HTTP-specific types.
- Repositories handle data access only. No business logic in queries.
- Cross-cutting concerns (auth, logging, metrics) go in middleware/interceptors, not business code.

## API Design

- Use consistent HTTP methods: GET (read), POST (create), PUT (full replace), PATCH (partial update), DELETE (remove).
- Return appropriate status codes: 200 (success), 201 (created), 204 (no content), 400 (bad request), 404 (not found), 409 (conflict), 500 (server error).
- Version APIs in the URL path: `/api/v1/resources`.
- Paginate all list endpoints. Default page size: 20. Max: 100.
- Return consistent error response shapes: `{ "error": "CODE", "message": "Human-readable detail" }`.

## Database

- All queries use parameterized statements. No exceptions.
- Migrations are forward-only. Never modify or delete an applied migration.
- Add indexes for any column used in WHERE, JOIN, or ORDER BY clauses on tables exceeding 10K rows.
- Use transactions for multi-step writes. Rollback on any failure.
- Name constraints and indexes explicitly. Never rely on auto-generated names.

## Configuration

- All environment-specific values come from environment variables or config files. Zero hardcoded values.
- Provide sensible defaults for non-secret configuration.
- Fail at startup if required configuration is missing. Do not fail at first request.
- Log the loaded configuration (redacting secrets) at startup.

## Reliability

- All external calls (HTTP, DB, cache) have explicit timeouts.
- Use circuit breakers for calls to external services.
- Health endpoints report dependency status, not just "200 OK".
- Structured logging with correlation IDs. Log level: INFO for business events, ERROR for failures, DEBUG for development.
- Never block the main thread with synchronous I/O in async runtimes.

## Dependencies

- Pin dependency versions. No floating ranges in production.
- Audit dependencies quarterly. Remove unused ones immediately.
- Prefer standard library solutions over third-party when equivalent.
