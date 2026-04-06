import express from 'express';
import cors from 'cors';
import dashboardRouter from './routes/dashboard';
import providersRouter from './routes/providers';
import servicesRouter from './routes/services';
import locationsRouter from './routes/locations';
import sheltersRouter from './routes/shelters';

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
app.use('/api/providers', providersRouter);
app.use('/api/services', servicesRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/shelters', sheltersRouter);

export default app;
