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

// GET /api/visuals — list all visuals (metadata only, not rows)
router.get('/', async (_req, res) => {
  try {
    const db = getDb();

    // Get keys only
    const keysSnap = await db
      .ref('powerbi_data')
      .orderByKey()
      .limitToFirst(200)
      .once('value');
    const data = keysSnap.val() as Record<string, unknown> | null;

    if (!data) {
      res.json({ data: [], total: 0 });
      return;
    }

    const keys = Object.keys(data);

    // Fetch metadata per visual (tiny payload each)
    const visuals = await Promise.all(
      keys.map(async (key) => {
        const metaSnap = await db
          .ref(`powerbi_data/${key}/metadata`)
          .once('value');
        const meta = metaSnap.val() as VisualMetadata | null;
        return { key, ...(meta ?? {}) };
      })
    );

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
    const visual = snapshot.val() as {
      metadata?: VisualMetadata;
      rows?: Record<string, unknown>[];
    } | null;

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
