/**
 * Example MCP Tool: search_codebase
 *
 * Searches the codebase using ripgrep and returns structured results.
 * Demonstrates: parameter validation, error handling, structured response.
 *
 * Add to your MCP server's tool registry:
 *   import { searchCodebaseTool } from './tools/search-codebase.js';
 *   server.tool(searchCodebaseTool.name, searchCodebaseTool.schema, searchCodebaseTool.handler);
 */

import { z } from 'zod';
import { execSync } from 'child_process';

// ── Parameter Schema ──
const SearchParams = z.object({
  pattern: z.string().min(1).describe('Regex pattern to search for'),
  path: z.string().optional().describe('Directory to search in (default: project root)'),
  fileType: z.string().optional().describe('File type filter (e.g., "ts", "py", "java")'),
  maxResults: z.number().min(1).max(100).default(20).describe('Maximum results to return'),
  caseSensitive: z.boolean().default(false).describe('Case-sensitive search'),
});

type SearchInput = z.infer<typeof SearchParams>;

// ── Response Types ──
interface SearchMatch {
  file: string;
  line: number;
  text: string;
}

interface SearchResult {
  matches: SearchMatch[];
  totalMatches: number;
  truncated: boolean;
  searchTime: string;
}

// ── Tool Handler ──
async function handler(params: SearchInput): Promise<SearchResult> {
  const start = Date.now();

  // Build ripgrep command
  const args: string[] = ['rg', '--json', '--no-heading'];

  if (!params.caseSensitive) args.push('-i');
  if (params.fileType) args.push('--type', params.fileType);
  args.push('--max-count', String(params.maxResults * 2)); // Get extras for counting
  args.push('--', params.pattern);
  if (params.path) args.push(params.path);

  let output: string;
  try {
    output = execSync(args.join(' '), {
      encoding: 'utf-8',
      timeout: 10000, // 10s timeout
      maxBuffer: 1024 * 1024, // 1MB max
    });
  } catch (error: unknown) {
    // ripgrep exits with code 1 when no matches found
    const execError = error as { status?: number; stdout?: string };
    if (execError.status === 1) {
      return { matches: [], totalMatches: 0, truncated: false, searchTime: `${Date.now() - start}ms` };
    }
    throw new Error(`Search failed: ${String(error)}`);
  }

  // Parse ripgrep JSON output
  const matches: SearchMatch[] = [];
  const lines = output.trim().split('\n').filter(Boolean);

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.type === 'match') {
        matches.push({
          file: parsed.data.path.text,
          line: parsed.data.line_number,
          text: parsed.data.lines.text.trim(),
        });
      }
    } catch {
      // Skip malformed lines
    }
  }

  const totalMatches = matches.length;
  const truncated = totalMatches > params.maxResults;
  const result = matches.slice(0, params.maxResults);

  return {
    matches: result,
    totalMatches,
    truncated,
    searchTime: `${Date.now() - start}ms`,
  };
}

// ── Export for MCP Registration ──
export const searchCodebaseTool = {
  name: 'search_codebase',
  schema: SearchParams,
  handler,
  description: 'Search the codebase using regex patterns. Returns file paths, line numbers, and matching text.',
};
