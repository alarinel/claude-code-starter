import { Router, Request, Response } from 'express';
import db from '../database.js';

const router = Router();

// GET /api/queue — list queue tasks
router.get('/', async (req: Request, res: Response) => {
  try {
    const statusFilter = req.query.status as string | undefined;

    let query = db('queue_tasks')
      .select('id', 'type', 'status', 'priority', 'title', 'description', 'assigned_agent', 'created_at', 'completed_at', 'result_summary')
      .orderBy([
        { column: 'priority', order: 'desc' },
        { column: 'created_at', order: 'desc' },
      ])
      .limit(200);

    if (statusFilter) {
      query = query.where('status', statusFilter);
    }

    const tasks = await query;
    res.json(tasks);
  } catch (err) {
    console.error('Error fetching queue:', err);
    res.status(500).json({ error: 'Failed to fetch queue tasks' });
  }
});

// GET /api/queue/:id — task details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const task = await db('queue_tasks').where('id', req.params.id).first();
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(task);
  } catch (err) {
    console.error('Error fetching task:', err);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// PATCH /api/queue/:id — update task status
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { status, assigned_agent, result_summary } = req.body;

    const allowedStatuses = new Set(['pending', 'in_progress', 'completed', 'failed']);
    if (status && !allowedStatuses.has(status)) {
      res.status(400).json({ error: `Invalid status: ${status}` });
      return;
    }

    const updates: Record<string, unknown> = {};

    if (status) updates.status = status;
    if (assigned_agent !== undefined) updates.assigned_agent = assigned_agent;
    if (result_summary !== undefined) updates.result_summary = result_summary;
    if (status === 'completed' || status === 'failed') {
      updates.completed_at = new Date().toISOString();
    }

    const count = await db('queue_tasks').where('id', req.params.id).update(updates);
    if (count === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const task = await db('queue_tasks').where('id', req.params.id).first();
    res.json(task);
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

export default router;
