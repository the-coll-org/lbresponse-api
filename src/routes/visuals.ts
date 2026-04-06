import { Router } from 'express';
import { getDb } from '../config/firebase';

const router = Router();

interface VisualMetadata {
  visual_name?: string;
  page?: string;
  entities?: string[];
  last_scraped?: string;
  row_count?: number;
}

interface VisualData {
  metadata?: VisualMetadata;
  rows?: Record<string, unknown>[];
}

// GET /api/visuals — list all visuals with metadata
router.get('/', async (_req, res) => {
  try {
    const db = getDb();
    const snapshot = await db.ref('powerbi_data').once('value');
    const data = snapshot.val() as Record<string, VisualData> | null;

    if (!data) {
      res.json({ data: [], total: 0 });
      return;
    }

    const visuals = Object.entries(data).map(([key, visual]) => ({
      key,
      ...visual.metadata,
    }));

    res.json({ data: visuals, total: visuals.length });
  } catch (err) {
    res
      .status(500)
      .json({ error: 'Failed to load visuals', detail: String(err) });
  }
});

// GET /api/visuals/:key — get rows for a specific visual
router.get('/:key', async (req, res) => {
  try {
    const db = getDb();
    const visualKey = req.params.key;
    const snapshot = await db.ref(`powerbi_data/${visualKey}`).once('value');
    const visual = snapshot.val() as VisualData | null;

    if (!visual) {
      res.status(404).json({ error: 'Visual not found' });
      return;
    }

    const rows = visual.rows ?? [];
    const metadata = visual.metadata ?? {};

    res.json({
      metadata,
      data: Array.isArray(rows) ? rows : Object.values(rows),
      total: Array.isArray(rows) ? rows.length : Object.keys(rows).length,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: 'Failed to load visual data', detail: String(err) });
  }
});

export default router;
