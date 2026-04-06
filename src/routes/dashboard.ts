import { Router } from 'express';
import { getDb } from '../config/database';

const router = Router();

interface TableDef {
  key: string;
  table: string;
}

router.get('/', (_req, res) => {
  try {
    const db = getDb();
    const counts: Record<string, number> = {};

    const tables: TableDef[] = [
      { key: 'providers', table: 'providers' },
      { key: 'services', table: 'services' },
      { key: 'locations', table: 'locations' },
      { key: 'shelters', table: 'shelters' },
      { key: 'service_availability', table: 'service_availability' },
      { key: 'shelter_needs', table: 'shelter_needs' },
      { key: 'aid_matches', table: 'aid_matches' },
    ];

    for (const def of tables) {
      try {
        const row = db
          .prepare(`SELECT COUNT(*) as count FROM "${def.table}"`)
          .get() as { count: number };
        counts[def.key] = row.count;
      } catch {
        counts[def.key] = 0;
      }
    }

    res.json({ data: counts });
  } catch (err) {
    res
      .status(500)
      .json({ error: 'Failed to load dashboard data', detail: String(err) });
  }
});

export default router;
