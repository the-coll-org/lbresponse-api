import { Request, Response } from 'express';
import { getSnapshot } from '../utils/entityStore';
import type { FilterGroup } from '../models/Organization';

const GROUP_LABELS = new Map<string, { en: string; ar: string }>([
  ['sector', { en: 'Sector', ar: 'القطاع' }],
  ['district', { en: 'District', ar: 'القضاء' }],
]);

function tally(
  values: Iterable<string | null | undefined>
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    const key = value.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export async function listFilters(_req: Request, res: Response): Promise<void> {
  const { providers, categories } = await getSnapshot();

  const sectorCounts = tally(providers.flatMap((p) => p.sectors ?? []));
  const districtCounts = tally(providers.flatMap((p) => p.districts ?? []));

  const groups: FilterGroup[] = Object.entries(categories).map(
    ([groupId, options]) => {
      const label = GROUP_LABELS.get(groupId) ?? { en: groupId, ar: groupId };
      const counts =
        groupId === 'sector'
          ? sectorCounts
          : groupId === 'district'
            ? districtCounts
            : new Map<string, number>();
      return {
        group_id: groupId,
        group_label: label.en,
        group_label_ar: label.ar,
        options: options.map((opt, i) => ({
          id: opt.key,
          label: opt.en_label,
          label_ar: opt.ar_label ?? null,
          result_count:
            counts.get(opt.en_label.toLowerCase()) ??
            counts.get(opt.key.toLowerCase()) ??
            0,
          display_order: opt.sort_order ?? i,
        })),
      };
    }
  );

  res.json({ data: groups });
}
