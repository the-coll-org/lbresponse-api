import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { db } from './config/firebase';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/firebase', async (_req, res) => {
  try {
    const collections = await db.listCollections();
    res.json({
      status: 'ok',
      firebase: 'connected',
      collections: collections.map((c) => c.id),
    });
  } catch {
    res.status(503).json({ status: 'error', firebase: 'disconnected' });
  }
});

app.get('/api/status', (_req, res) => {
  res.json({
    name: 'lbresponse-api',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
