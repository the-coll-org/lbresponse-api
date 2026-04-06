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
      SELECT sh.shelter_id, sh.shelter_name, sh.shelter_type,
             sh.capacity_total, sh.population_total, sh.households_count,
             sh.women_count, sh.children_count, sh.elderly_count,
             sh.pwds_count, sh.status, sh.contact_name, sh.contact_phone,
             sh.last_update,
             l.governorate, l.city, l.district
      FROM shelters sh
      LEFT JOIN locations l ON sh.location_id = l.location_id
      ORDER BY sh.last_update DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(limit, offset);

    const total = (
      db.prepare('SELECT COUNT(*) as count FROM shelters').get() as {
        count: number;
      }
    ).count;

    res.json({ data: rows, total });
  } catch (err) {
    res
      .status(500)
      .json({ error: 'Failed to load shelters', detail: String(err) });
  }
});

export default router;
