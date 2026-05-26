import { describe, it, expect } from 'vitest';
import {
  buildMergedDtos,
  filterDtos,
} from '../controllers/organizationsController';
import type { Location, Provider } from '../models/Organization';

function makeProvider(overrides: Partial<Provider> = {}): Provider {
  return {
    provider_id: overrides.provider_id ?? 'p1',
    provider_name: overrides.provider_name ?? 'Org One',
    sectors: overrides.sectors ?? [],
    districts: overrides.districts ?? [],
    services: overrides.services ?? [],
    ...overrides,
  };
}

describe('buildMergedDtos populates normalized categories + governorate', () => {
  it('maps raw sectors to CRN categories and dedupes by id', () => {
    const provider = makeProvider({
      provider_id: 'p1',
      provider_name: 'Multi Sector Org',
      sectors: ['CWG', 'Nutrition'],
      districts: ['Beirut'],
    });
    const locations = new Map<string, Location>([
      ['l1', { location_id: 'l1', district: 'Beirut', governorate: 'Beirut' }],
    ]);

    const [dto] = buildMergedDtos([provider], locations);
    expect(dto.categories.map((c) => c.id).sort()).toEqual([
      'cash_livelihood',
      'food_nutrition',
    ]);
    expect(dto.sectors).toEqual(['CWG', 'Nutrition']);
    expect(dto.governorate).toBe('Beirut');
  });

  it('keeps unknown raw sectors visible with id=unknown', () => {
    const provider = makeProvider({
      sectors: ['NotARealSector'],
      districts: ['Tripoli'],
    });
    const [dto] = buildMergedDtos([provider], new Map());
    expect(dto.categories).toHaveLength(1);
    expect(dto.categories[0].id).toBe('unknown');
    expect(dto.categories[0].label).toBe('NotARealSector');
  });
});

describe('filterDtos category filter', () => {
  const locations = new Map<string, Location>();
  const orgs = buildMergedDtos(
    [
      makeProvider({
        provider_id: 'a',
        provider_name: 'Food Org',
        sectors: ['Nutrition'],
      }),
      makeProvider({
        provider_id: 'b',
        provider_name: 'Cash Org',
        sectors: ['CWG'],
      }),
      makeProvider({
        provider_id: 'c',
        provider_name: 'Edu Org',
        sectors: ['Education'],
      }),
    ],
    locations
  );

  it('matches normalized category id, not raw name', () => {
    const got = filterDtos(orgs, {
      types: [],
      sectorFilter: [],
      locationFilter: [],
      categoryFilter: ['food_nutrition'],
    });
    expect(got.map((d) => d.title)).toEqual(['Food Org']);
  });

  it('ANDs with raw sector filter', () => {
    const got = filterDtos(orgs, {
      types: [],
      sectorFilter: ['cwg'],
      locationFilter: [],
      categoryFilter: ['cash_livelihood'],
    });
    expect(got.map((d) => d.title)).toEqual(['Cash Org']);
  });

  it('returns nothing when both filters disagree', () => {
    const got = filterDtos(orgs, {
      types: [],
      sectorFilter: ['cwg'],
      locationFilter: [],
      categoryFilter: ['education'],
    });
    expect(got).toEqual([]);
  });

  it('is a no-op when categoryFilter is empty', () => {
    const got = filterDtos(orgs, {
      types: [],
      sectorFilter: [],
      locationFilter: [],
      categoryFilter: [],
    });
    expect(got).toHaveLength(3);
  });
});
