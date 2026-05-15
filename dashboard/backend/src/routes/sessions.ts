import { Router, Request, Response } from 'express';
import db from '../database.js';

const router = Router();

// GET /api/sessions — list active sessions
router.get('/', async (_req: Request, res: Response) => {
  try {
    const sessions = await db('sessions')
      .select('id', 'short_id', 'started_at', 'ended_at', 'status', 'summary', 'context_percent')
      .orderBy('started_at', 'desc')
      .limit(100);
    res.json(sessions);
  } catch (err) {
    console.error('Error fetching sessions:', err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// GET /api/sessions/:id — session details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const session = await db('sessions').where('id', req.params.id).first();
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const agents = await db('agents')
      .where('session_id', req.params.id)
      .orderBy('started_at', 'desc');

    res.json({ ...session, agents });
  } catch (err) {
    console.error('Error fetching session:', err);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

export default router;
