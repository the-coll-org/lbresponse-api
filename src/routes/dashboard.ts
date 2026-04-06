import { Router } from 'express';
import { db } from '../config/firebase';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const snapshot = await db.ref('powerbi_data').once('value');
    const data = snapshot.val() as Record<
      string,
      { metadata?: { row_count?: number; page?: string } }
    > | null;

    if (!data) {
      res.json({ visuals: 0, rows: 0, pages: [] });
      return;
    }

    const pages = new Set<string>();
    let totalRows = 0;
    let totalVisuals = 0;

    for (const visual of Object.values(data)) {
      totalVisuals++;
      if (visual.metadata) {
        totalRows += visual.metadata.row_count ?? 0;
        if (visual.metadata.page) {
          pages.add(visual.metadata.page);
        }
      }
    }

    res.json({
      visuals: totalVisuals,
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
