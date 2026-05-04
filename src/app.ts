import express from 'express';
import cors from 'cors';
import dashboardRouter from './routes/dashboard';
import visualsRouter from './routes/visuals';
import organizationsRouter from './routes/organizations';
import filtersRouter from './routes/filters';
import clientErrorsRouter from './routes/clientErrors';
import { requestLogger } from './middleware/logger';
import { errorHandler, notFound } from './middleware/error';

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

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
app.use('/api/organizations', organizationsRouter);
app.use('/api/filters', filtersRouter);
app.use('/api/client-errors', clientErrorsRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
