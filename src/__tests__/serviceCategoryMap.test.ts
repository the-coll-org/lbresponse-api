import { describe, it, expect } from 'vitest';
import {
  normalizeCategory,
  normalizeCategories,
  CRN_CATEGORY_OPTIONS,
} from '../lib/serviceCategoryMap';

describe('normalizeCategory', () => {
  it('maps CWG to cash_livelihood', () => {
    const got = normalizeCategory('CWG');
    expect(got.id).toBe('cash_livelihood');
    expect(got.label).toBe('Cash & Livelihood');
    expect(got.raw_name).toBe('CWG');
  });

  it('is case- and whitespace-insensitive', () => {
    const got = normalizeCategory('  wash ');
    expect(got.id).toBe('wash');
    expect(got.label).toBe('Water, Sanitation & Hygiene');
  });

  it('falls back to unknown for unmapped names', () => {
    const got = normalizeCategory('Mystery Sector');
    expect(got.id).toBe('unknown');
    expect(got.label).toBe('Mystery Sector');
    expect(got.raw_name).toBe('Mystery Sector');
  });
});

describe('normalizeCategories', () => {
  it('dedupes raw names that map to the same CRN id', () => {
    const got = normalizeCategories(['CWG', 'Livelihoods']);
    expect(got).toHaveLength(1);
    expect(got[0].id).toBe('cash_livelihood');
  });

  it('skips empty/null entries', () => {
    const got = normalizeCategories(['', null, undefined, 'Education']);
    expect(got).toHaveLength(1);
    expect(got[0].id).toBe('education');
  });

  it('keeps distinct CRN ids', () => {
    const got = normalizeCategories(['CWG', 'Nutrition', 'Education']);
    const ids = got.map((c) => c.id).sort();
    expect(ids).toEqual(['cash_livelihood', 'education', 'food_nutrition']);
  });

  it('dedupes unknowns by label', () => {
    const got = normalizeCategories(['Mystery', 'Mystery', 'Other']);
    expect(got.map((c) => c.id)).toEqual(['unknown', 'unknown']);
    expect(got.map((c) => c.label).sort()).toEqual(['Mystery', 'Other']);
  });
});

describe('CRN_CATEGORY_OPTIONS', () => {
  it('exposes one option per distinct CRN id, sorted by label', () => {
    const ids = CRN_CATEGORY_OPTIONS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    const labels = CRN_CATEGORY_OPTIONS.map((c) => c.label);
    expect([...labels]).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
  });
});
