// Maps raw Power BI sector/service names → CRN UI category id+label.
// To add or change a mapping, edit the SERVICE_CATEGORY_MAP entries below.
// Lookup is case- and whitespace-insensitive.

import { logger } from './logger';

export interface CrnCategory {
  id: string;
  label: string;
}

export interface NormalizedCategory {
  id: string;
  label: string;
  raw_name: string;
}

export const SERVICE_CATEGORY_MAP: Record<string, CrnCategory> = {
  'Child Protection': { id: 'child_protection', label: 'Child Protection' },
  CWG: { id: 'cash_livelihood', label: 'Cash & Livelihood' },
  Livelihoods: { id: 'cash_livelihood', label: 'Cash & Livelihood' },
  Education: { id: 'education', label: 'Education' },
  'Food Security & Agriculture': {
    id: 'food_nutrition',
    label: 'Food & Nutrition',
  },
  Nutrition: { id: 'food_nutrition', label: 'Food & Nutrition' },
  GBV: { id: 'gbv', label: 'GBV' },
  Protection: { id: 'protection', label: 'Protection' },
  Shelter: { id: 'shelter', label: 'Shelter' },
  'Social Stability': { id: 'social_stability', label: 'Social Stability' },
  WaSH: { id: 'wash', label: 'Water, Sanitation & Hygiene' },
};

const LOOKUP = new Map<string, CrnCategory>(
  Object.entries(SERVICE_CATEGORY_MAP).map(([k, v]) => [
    k.toLowerCase().trim(),
    v,
  ])
);

const warnedUnmapped = new Set<string>();

export function normalizeCategory(raw: string): NormalizedCategory {
  const trimmed = (raw ?? '').trim();
  const hit = LOOKUP.get(trimmed.toLowerCase());
  if (hit) return { id: hit.id, label: hit.label, raw_name: trimmed };

  if (
    process.env.NODE_ENV !== 'production' &&
    trimmed &&
    !warnedUnmapped.has(trimmed)
  ) {
    warnedUnmapped.add(trimmed);
    logger.warn({ raw_name: trimmed }, 'unmapped service category');
  }
  return { id: 'unknown', label: trimmed, raw_name: trimmed };
}

export function normalizeCategories(
  rawNames: Iterable<string | null | undefined>
): NormalizedCategory[] {
  const byId = new Map<string, NormalizedCategory>();
  for (const raw of rawNames) {
    if (!raw) continue;
    const cat = normalizeCategory(raw);
    if (!cat.label) continue;
    // Dedupe: first raw_name wins for a given CRN id. The full raw list
    // remains available on OrganizationDto.sectors.
    const dedupeKey =
      cat.id === 'unknown' ? `unknown:${cat.label.toLowerCase()}` : cat.id;
    if (!byId.has(dedupeKey)) byId.set(dedupeKey, cat);
  }
  return [...byId.values()];
}

export const CRN_CATEGORY_OPTIONS: CrnCategory[] = (() => {
  const seen = new Map<string, CrnCategory>();
  for (const v of Object.values(SERVICE_CATEGORY_MAP)) {
    if (!seen.has(v.id)) seen.set(v.id, v);
  }
  return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
})();
