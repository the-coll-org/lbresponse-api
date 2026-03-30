import 'dotenv/config';
import app from './app';
import { db } from './config/firebase';

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
