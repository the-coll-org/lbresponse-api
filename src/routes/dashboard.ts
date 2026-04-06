import { Router } from 'express';
import { getDb } from '../config/firebase';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const db = getDb();
    // Get just the keys without loading all data
    const keysSnap = await db
      .ref('powerbi_data')
      .orderByKey()
      .limitToFirst(200)
      .once('value');
    const data = keysSnap.val() as Record<string, unknown> | null;

    if (!data) {
      res.json({ visuals: 0, rows: 0, pages: [] });
      return;
    }

    const keys = Object.keys(data);
    const pages = new Set<string>();
    let totalRows = 0;

    // Fetch only metadata for each (small payload per key)
    const metaPromises = keys.map(async (key) => {
      const metaSnap = await db
        .ref(`powerbi_data/${key}/metadata`)
        .once('value');
      return metaSnap.val() as {
        row_count?: number;
        page?: string;
      } | null;
    });

    const metas = await Promise.all(metaPromises);
    for (const meta of metas) {
      if (meta) {
        totalRows += meta.row_count ?? 0;
        if (meta.page) pages.add(meta.page);
      }
    }

    res.json({
      visuals: keys.length,
      rows: totalRows,
      pages: [...pages],
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: 'Failed to load dashboard', detail: String(err) });
  }
});

export default router;
