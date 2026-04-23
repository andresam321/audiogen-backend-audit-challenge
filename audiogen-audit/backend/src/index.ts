import express from 'express';
import cors from 'cors';
import { requestLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import jobsRouter from './routes/jobs.js';
import usersRouter from './routes/users.js';

export const app = express();

const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/jobs', jobsRouter);
app.use('/api/users', usersRouter);

// Must be registered after all routes
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[server] AudioGen backend running → http://localhost:${PORT}`);
    console.log(`[server] Health check → http://localhost:${PORT}/health`);
  });
}

export default app;
