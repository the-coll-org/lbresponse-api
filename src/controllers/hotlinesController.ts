import { Request, Response } from 'express';
import { getSnapshot } from '../utils/entityStore';

function qs(v: unknown): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return (v[0] as string) ?? '';
  return '';
}

function clampInt(v: unknown, fallback: number, min = 1, max = 1000): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export async function listHotlines(req: Request, res: Response): Promise<void> {
  const { hotlines } = await getSnapshot();

  const category = qs(req.query.category).trim().toLowerCase();
  const city = qs(req.query.city).trim().toLowerCase();
  const search = qs(req.query.search).trim().toLowerCase();
  const page = clampInt(req.query.page, 1);
  const pageSize = clampInt(req.query.page_size, 10, 1, 100);

  const filtered = hotlines.filter((h) => {
    if (category && h.category.toLowerCase() !== category) return false;
    if (city && h.city.toLowerCase() !== city) return false;
    if (search) {
      const haystack = [
        h.name_en,
        h.name_ar,
        h.category,
        h.city,
        h.hotline,
        h.phone,
        h.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);

  res.json({ data, total, page, page_size: pageSize });
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
