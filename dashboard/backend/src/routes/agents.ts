import { Router, Request, Response } from 'express';
import db from '../database.js';

const router = Router();

// GET /api/agents — list agents
router.get('/', async (_req: Request, res: Response) => {
  try {
    const agents = await db('agents')
      .select('id', 'session_id', 'status', 'model', 'task_type', 'task_summary', 'started_at', 'ended_at', 'exit_code')
      .orderBy('started_at', 'desc')
      .limit(100);
    res.json(agents);
  } catch (err) {
    console.error('Error fetching agents:', err);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// GET /api/agents/:id — agent details with log output
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const agent = await db('agents').where('id', req.params.id).first();
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    res.json(agent);
  } catch (err) {
    console.error('Error fetching agent:', err);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

export default router;
