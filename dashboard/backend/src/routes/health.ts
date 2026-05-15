import { Router, Request, Response } from 'express';
import db from '../database.js';

const router = Router();

// GET /api/health — dashboard health check
router.get('/', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: string; latency_ms: number }> = {};

  // Database check
  const dbStart = Date.now();
  try {
    await db.raw('SELECT 1');
    checks.database = { status: 'healthy', latency_ms: Date.now() - dbStart };
  } catch {
    checks.database = { status: 'unhealthy', latency_ms: Date.now() - dbStart };
  }

  // Aggregate counts
  try {
    const [activeSessions] = await db('sessions').where('status', 'active').count('* as count');
    const [pendingTasks] = await db('queue_tasks').where('status', 'pending').count('* as count');
    const [runningAgents] = await db('agents').where('status', 'running').count('* as count');

    const overallStatus = checks.database.status === 'healthy' ? 'healthy' : 'degraded';

    res.json({
      status: overallStatus,
      uptime: process.uptime(),
      checks,
      counts: {
        active_sessions: Number((activeSessions as Record<string, number>).count),
        pending_tasks: Number((pendingTasks as Record<string, number>).count),
        running_agents: Number((runningAgents as Record<string, number>).count),
      },
    });
  } catch {
    res.status(500).json({
      status: 'unhealthy',
      checks,
      counts: null,
    });
  }
});

export default router;
