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
      SELECT s.service_id, s.service_name, s.service_code, s.sector,
             s.service_type, s.description, s.aid_type, s.status,
             s.created_at, s.updated_at,
             p.provider_name
      FROM services s
      LEFT JOIN providers p ON s.provider_id = p.provider_id
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(limit, offset);

    const total = (
      db.prepare('SELECT COUNT(*) as count FROM services').get() as {
        count: number;
      }
    ).count;

    res.json({ data: rows, total });
  } catch (err) {
    res
      .status(500)
      .json({ error: 'Failed to load services', detail: String(err) });
  }
});

export default router;
