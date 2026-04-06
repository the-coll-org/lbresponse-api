import { Router } from 'express';
import { getDb } from '../config/firebase';
import { firebaseShallowGet } from '../config/firebaseRest';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const shallow = await firebaseShallowGet('powerbi_data');

    if (!shallow) {
      res.json({ visuals: 0, rows: 0, pages: [] });
      return;
    }

    const keys = Object.keys(shallow);
    const db = getDb();

    const pages = new Set<string>();
    let totalRows = 0;

    const metas = await Promise.all(
      keys.map(async (key) => {
        const snap = await db.ref(`powerbi_data/${key}/metadata`).once('value');
        return snap.val() as {
          row_count?: number;
          page?: string;
        } | null;
      })
    );

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
