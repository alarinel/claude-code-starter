import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getHealthReport } from '../services/health.js';
import { createChildLogger } from '../services/logger.js';

const log = createChildLogger('tool:health');

/**
 * Register the `health` tool.
 *
 * Returns the aggregate health status of all backend services (database,
 * Redis, and any custom-registered checks) along with per-service latency.
 */
export function registerHealthTool(server: McpServer): void {
  server.tool(
    'health',
    'Check the health of all backend services. Returns healthy/degraded/unhealthy with per-service latency.',
    {},
    async () => {
      log.info('health check requested');
      try {
        const report = await getHealthReport();
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(report, null, 2),
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error({ err }, 'health check failed');
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
          isError: true,
        };
      }
    },
  );
}
