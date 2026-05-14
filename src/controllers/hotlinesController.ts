import { Request, Response } from 'express';
import { getSnapshot } from '../utils/entityStore';

function qs(v: unknown): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return (v[0] as string) ?? '';
  return '';
}

export async function listHotlines(req: Request, res: Response): Promise<void> {
  const { hotlines } = await getSnapshot();

  const category = qs(req.query.category).trim().toLowerCase();
  const city = qs(req.query.city).trim().toLowerCase();

  const data = hotlines.filter((h) => {
    if (category && h.category.toLowerCase() !== category) return false;
    if (city && h.city.toLowerCase() !== city) return false;
    return true;
  });

  res.json({ data, total: data.length });
}

export async function getHotline(req: Request, res: Response): Promise<void> {
  const { hotlines } = await getSnapshot();
  const h = hotlines.find((h) => h.id === req.params.id);
  if (!h) {
    res.status(404).json({ error: 'Hotline not found' });
    return;
  }
  res.json({ data: h });
}
