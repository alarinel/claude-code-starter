# MCP Server TypeScript Standards

Applies to Model Context Protocol server implementations built with TypeScript.

## Architecture

- One tool per function. Each MCP tool maps to exactly one handler function.
- Use a registry pattern: tools self-register with metadata (name, description, parameters).
- Parameter validation happens at the tool boundary, before any business logic.
- Return structured responses with consistent shapes. Never return raw strings for data.
- Error responses include an error code, human-readable message, and suggested fix.

## TypeScript

- Strict mode enabled: `"strict": true` in tsconfig.json. No exceptions.
- No `any` types. Use `unknown` and narrow with type guards when the type is truly dynamic.
- Prefer interfaces for object shapes. Use type aliases for unions and intersections.
- Enums for fixed sets of values. String enums over numeric enums.
- Async functions return explicit Promise types: `async function getUser(): Promise<User>`.

## Tool Design

- Tool names use snake_case: `get_user_profile`, `run_query`, `list_sessions`.
- Tool descriptions are concise but complete. Include what it does, required params, and common errors.
- Required parameters come first in the schema. Optional parameters have documented defaults.
- Idempotent tools where possible. Running the same tool twice should not cause side effects.
- Long-running operations return immediately with a status handle, not block until completion.

## Error Handling

- Wrap all tool handlers in a top-level try/catch. Never let unhandled exceptions crash the server.
- Map internal errors to MCP-appropriate error codes.
- Log errors with full context (tool name, parameters, stack trace) but redact secrets.
- Circuit breakers for external service calls (database, HTTP APIs, Redis).
- Timeout all external calls. Default: 30 seconds for DB, 10 seconds for HTTP, 5 seconds for cache.

## Performance

- Connection pooling for databases. Never open a connection per request.
- Cache expensive lookups with TTL-based expiration.
- Batch database queries when a tool needs multiple related records.
- Stream large responses instead of buffering entire result sets in memory.

## Security

- Sanitize all SQL inputs via parameterized queries. Never interpolate user input.
- Validate file paths against an allowlist. Never allow arbitrary filesystem access.
- Rate-limit tool calls per session to prevent runaway agents.
- Log all tool invocations with session ID for audit trails.

## Testing

- Each tool has unit tests covering: success path, validation errors, external service failures.
- Integration tests verify the full MCP protocol (request -> tool -> response).
- Mock external dependencies (DB, Redis, HTTP) at the adapter level.
- Test parameter validation exhaustively: missing required fields, wrong types, boundary values.
