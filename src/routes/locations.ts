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
      SELECT location_id, governorate, city, district, locality,
             longitude, latitude, accessibility
      FROM locations
      ORDER BY governorate, city
      LIMIT ? OFFSET ?
    `
      )
      .all(limit, offset);

    const total = (
      db.prepare('SELECT COUNT(*) as count FROM locations').get() as {
        count: number;
      }
    ).count;

    res.json({ data: rows, total });
  } catch (err) {
    res
      .status(500)
      .json({ error: 'Failed to load locations', detail: String(err) });
  }
});

export default router;
