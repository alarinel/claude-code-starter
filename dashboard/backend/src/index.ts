import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDatabase } from './database.js';
import sessionsRouter from './routes/sessions.js';
import queueRouter from './routes/queue.js';
import agentsRouter from './routes/agents.js';
import healthRouter from './routes/health.js';

const app = express();
const PORT = parseInt(process.env.PORT || '5001', 10);

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/sessions', sessionsRouter);
app.use('/api/queue', queueRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/health', healthRouter);

async function start(): Promise<void> {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Dashboard backend running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
