import express from 'express';
import cors from 'cors';
import dashboardRouter from './routes/dashboard';
import visualsRouter from './routes/visuals';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/status', (_req, res) => {
  res.json({
    name: 'lbresponse-api',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.use('/api/dashboard', dashboardRouter);
app.use('/api/visuals', visualsRouter);

export default app;
