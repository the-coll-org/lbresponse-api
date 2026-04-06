import { Router } from 'express';
import { getDb } from '../config/firebase';
import https from 'https';

const router = Router();

interface VisualMetadata {
  visual_name?: string;
  page?: string;
  entities?: string[];
  last_scraped?: string;
  row_count?: number;
}

function firebaseGet(path: string): Promise<unknown> {
  const dbUrl = process.env.FIREBASE_DB_URL ?? '';
  const url = `${dbUrl}/${path}.json`;
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let body = '';
        res.on('data', (chunk: string) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(
              new Error(`Invalid JSON from Firebase: ${body.slice(0, 200)}`)
            );
          }
        });
      })
      .on('error', reject);
  });
}

// GET /api/visuals — list all visuals with metadata only
router.get('/', async (_req, res) => {
  try {
    // Get keys first (shallow)
    const shallow = (await firebaseGet('powerbi_data?shallow=true')) as Record<
      string,
      boolean
    > | null;

    if (!shallow) {
      res.json({ data: [], total: 0 });
      return;
    }

    const keys = Object.keys(shallow);

    // Fetch metadata for each visual (small payloads)
    const visuals = await Promise.all(
      keys.map(async (key) => {
        try {
          const meta = (await firebaseGet(
            `powerbi_data/${key}/metadata`
          )) as VisualMetadata | null;
          return { key, ...(meta ?? {}) };
        } catch {
          return { key };
        }
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
