import { Request, Response } from 'express';
import { getSnapshot } from '../utils/entityStore';
import type { FilterGroup } from '../models/Organization';

const GROUP_LABELS = new Map<string, { en: string; ar: string }>([
  ['provider_type', { en: 'Organization Type', ar: 'نوع المنظمة' }],
  ['sector', { en: 'Sector', ar: 'القطاع' }],
  ['service_subtype', { en: 'Service', ar: 'الخدمة' }],
  ['need_type', { en: 'Need Type', ar: 'نوع الحاجة' }],
  ['shelter_type', { en: 'Shelter Type', ar: 'نوع المأوى' }],
]);

export async function listFilters(_req: Request, res: Response): Promise<void> {
  const { providers, categories } = await getSnapshot();

  const providerTypeCounts = new Map<string, number>();
  for (const p of providers) {
    const key = String(p.provider_type ?? '').toLowerCase();
    if (!key) continue;
    providerTypeCounts.set(key, (providerTypeCounts.get(key) ?? 0) + 1);
  }

  const groups: FilterGroup[] = Object.entries(categories).map(
    ([groupId, options]) => {
      const label = GROUP_LABELS.get(groupId) ?? { en: groupId, ar: groupId };
      const counts =
        groupId === 'provider_type'
          ? providerTypeCounts
          : new Map<string, number>();
      return {
        group_id: groupId,
        group_label: label.en,
        group_label_ar: label.ar,
        options: options.map((opt, i) => ({
          id: opt.key,
          label: opt.en_label,
          label_ar: opt.ar_label ?? null,
          result_count: counts.get(opt.key.toLowerCase()) ?? 0,
          display_order: opt.sort_order ?? i,
        })),
      };
    }
  );

  res.json({ data: groups });
}
