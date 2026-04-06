import { Router, Request, Response } from 'express';
import https from 'https';

const router = Router();

function firebaseGet(path: string): Promise<unknown> {
  const dbUrl = process.env.FIREBASE_DB_URL ?? '';
  const url = `${dbUrl}/${path}.json?shallow=true`;
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

router.get('/', async (_req: Request, res: Response) => {
  try {
    // Shallow query — only gets keys, not full data
    const shallow = (await firebaseGet('powerbi_data')) as Record<
      string,
      boolean
    > | null;

    if (!shallow) {
      res.json({ visuals: 0, rows: 0, pages: [] });
      return;
    }

    const keys = Object.keys(shallow);
    res.json({
      visuals: keys.length,
      rows: 0, // Would need per-visual metadata fetch to get exact count
      pages: [],
      visual_keys: keys,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: 'Failed to load dashboard', detail: String(err) });
  }
});

export default router;
