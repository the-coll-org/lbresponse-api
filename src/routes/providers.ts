import { Router } from 'express';
import { getDb } from '../config/database';

const router = Router();

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Number(req.query.offset) || 0;

    const rows = db
      .prepare(
        `
      SELECT provider_id, provider_name, provider_type, website,
             contact_name, contact_phone, is_active, created_at
      FROM providers
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(limit, offset);

    const total = (
      db.prepare('SELECT COUNT(*) as count FROM providers').get() as {
        count: number;
      }
    ).count;

    res.json({ data: rows, total });
  } catch (err) {
    res
      .status(500)
      .json({ error: 'Failed to load providers', detail: String(err) });
  }
});

export default router;
