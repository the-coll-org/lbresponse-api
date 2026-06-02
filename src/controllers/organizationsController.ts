import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { getDb } from '../config/firebase';
import { HttpError } from '../middleware/error';
import { getSnapshot, invalidateSnapshot } from '../utils/entityStore';
import type {
  Location,
  MapListingDto,
  MapProviderDto,
  MapRegionGroup,
  OrganizationDto,
  Provider,
  ProviderContact,
} from '../models/Organization';
import { normalizeCategories } from '../lib/serviceCategoryMap';

const CONTACT_TYPES = new Set(['phone', 'whatsapp', 'email', 'call']);

type Sort = 'az' | 'relevance';

function str(v: unknown): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(str).join(',');
  return '';
}

function toArray(v: unknown): string[] {
  return str(v)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function clampInt(v: unknown, fallback: number, min = 1, max = 1000): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isValidLebanesePhone(text: string): boolean {
  let digits = text.replace(/\D/g, '');
  if (digits.startsWith('961')) digits = digits.slice(3);
  if (digits.length < 7 || digits.length > 8) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  if (digits.startsWith('00')) return false;
  return true;
}

function pushIfValidPhone(
  out: string[],
  seen: Set<string>,
  raw: unknown
): void {
  if (typeof raw !== 'string') return;
  const trimmed = raw.trim();
  if (!trimmed || seen.has(trimmed) || !isValidLebanesePhone(trimmed)) return;
  seen.add(trimmed);
  out.push(trimmed);
}

function collectPhones(
  ...contacts: (ProviderContact | null | undefined)[]
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of contacts) {
    if (!c) continue;
    pushIfValidPhone(out, seen, c.phone);
    pushIfValidPhone(out, seen, c.whatsapp);
  }
  return out;
}

function pickWhatsapp(
  ...contacts: (ProviderContact | null | undefined)[]
): string | null {
  for (const c of contacts) {
    if (!c) continue;
    const wa = typeof c.whatsapp === 'string' ? c.whatsapp.trim() : '';
    if (wa && isValidLebanesePhone(wa)) return wa;
  }
  return null;
}

function pickEmail(
  ...contacts: (ProviderContact | null | undefined)[]
): string | null {
  for (const c of contacts) {
    const email = typeof c?.email === 'string' ? c.email.trim() : '';
    if (email) return email;
  }
  return null;
}

function buildDescription(p: Provider): string | null {
  const services = Array.isArray(p.services) ? p.services : [];
  const names: string[] = [];
  const seen = new Set<string>();
  for (const s of services) {
    const raw = typeof s.name === 'string' ? s.name.trim() : '';
    const name = raw.replace(/^[A-Z][A-Z0-9]*\d+:\s*/, '');
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    names.push(name);
    if (names.length >= 3) break;
  }
  return names.length ? names.join('; ') : null;
}

function buildMapUrlFromDistricts(districts: string[]): string | null {
  if (districts.length === 0) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(districts[0] + ', Lebanon')}`;
}

function lookupGovernorate(
  districts: string[],
  locations: Map<string, Location>
): string | null {
  if (!districts.length || locations.size === 0) return null;
  const wanted = new Set(districts.map((d) => d.toLowerCase().trim()));
  for (const loc of locations.values()) {
    const d = (loc.district ?? '').toLowerCase().trim();
    if (d && wanted.has(d) && loc.governorate) return loc.governorate;
  }
  return null;
}

function toDto(p: Provider, locations: Map<string, Location>): OrganizationDto {
  const primary = p.primary_contact ?? null;
  const secondary = p.secondary_contact ?? null;
  const sectors = Array.isArray(p.sectors) ? p.sectors.filter(Boolean) : [];
  const districts = Array.isArray(p.districts)
    ? p.districts.filter(Boolean)
    : [];
  const services = Array.isArray(p.services) ? p.services : [];
  const phones = collectPhones(primary, secondary);
  const categories = normalizeCategories([
    ...sectors,
    ...services.map((s) => s.sector ?? ''),
  ]);
  const governorate = lookupGovernorate(districts, locations);

  return {
    id: p.provider_id,
    title: p.provider_name,
    title_ar: p.provider_name_ar ?? null,
    description: buildDescription(p),
    description_ar: null,
    email: pickEmail(primary, secondary),
    verified: Boolean(p.verified),
    phone_numbers: phones,
    whatsapp: pickWhatsapp(primary, secondary),
    social_media: [],
    type: null,
    locations: districts,
    governorate,
    sectors,
    categories,
    services,
    service_count:
      typeof p.service_count === 'number' ? p.service_count : services.length,
    primary_contact_name: primary?.name ?? null,
    secondary_contact: secondary,
    map_url: buildMapUrlFromDistricts(districts),
    organization_type: sectors[0] ?? null,
    updated_at: p.updated_at ?? null,
  };
}

function expandToDtos(
  p: Provider,
  locations: Map<string, Location>
): { dto: OrganizationDto; isSplit: boolean }[] {
  const baseDto = toDto(p, locations);
  const beforeSlash = baseDto.title.split('/')[0].trim() || baseDto.title;
  const fragments = beforeSlash
    .split(',')
    .map((n) => n.trim())
    .filter((n) => n.length > 0 && /[A-Za-z؀-ۿ]/.test(n));
  if (fragments.length === 0) {
    return [{ dto: baseDto, isSplit: false }];
  }
  if (fragments.length === 1) {
    if (fragments[0] === baseDto.title) {
      return [{ dto: baseDto, isSplit: false }];
    }
    return [{ dto: { ...baseDto, title: fragments[0] }, isSplit: false }];
  }
  return fragments.map((name, idx) => ({
    dto: {
      ...baseDto,
      id: `${baseDto.id}:${idx}`,
      title: name,
    },
    isSplit: true,
  }));
}

export function buildMergedDtos(
  providers: Provider[],
  locations: Map<string, Location>
): OrganizationDto[] {
  const seen = new Map<string, { dto: OrganizationDto; isSplit: boolean }>();
  for (const p of providers) {
    for (const expanded of expandToDtos(p, locations)) {
      const district = (expanded.dto.locations[0] ?? '').toLowerCase().trim();
      const key = `${expanded.dto.title.toLowerCase().trim()}|${district}`;
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, expanded);
        continue;
      }
      const existingHasPhone = existing.dto.phone_numbers.length > 0;
      const expandedHasPhone = expanded.dto.phone_numbers.length > 0;
      if (!existingHasPhone && expandedHasPhone) {
        seen.set(key, expanded);
        continue;
      }
      if (existingHasPhone && !expandedHasPhone) {
        continue;
      }
      if (existing.isSplit && !expanded.isSplit) {
        seen.set(key, expanded);
      }
    }
  }

  const contactMerged = new Map<string, OrganizationDto>();
  const ungrouped: OrganizationDto[] = [];
  for (const { dto } of seen.values()) {
    const phone = dto.phone_numbers[0]?.trim() ?? '';
    const email = dto.email?.trim() ?? '';
    const contactKey = phone
      ? `phone:${phone}`
      : email
        ? `email:${email.toLowerCase()}`
        : '';
    if (!contactKey) {
      ungrouped.push(dto);
      continue;
    }
    const key = `${dto.title.toLowerCase().trim()}|${contactKey}`;
    const existing = contactMerged.get(key);
    if (!existing) {
      contactMerged.set(key, dto);
      continue;
    }
    const districts = new Set(existing.locations);
    for (const d of dto.locations) districts.add(d);
    contactMerged.set(key, { ...existing, locations: [...districts] });
  }
  return [...contactMerged.values(), ...ungrouped];
}

interface FilterParams {
  types: string[];
  sectorFilter: string[];
  locationFilter: string[];
  categoryFilter?: string[];
}

export function filterDtos(
  dtos: OrganizationDto[],
  params: FilterParams
): OrganizationDto[] {
  const { types, sectorFilter, locationFilter, categoryFilter = [] } = params;
  return dtos.filter((dto) => {
    if (
      types.length &&
      !types.includes((dto.organization_type ?? '').toLowerCase())
    )
      return false;
    if (
      sectorFilter.length &&
      !dto.sectors.some((s) => sectorFilter.includes(slugify(s)))
    )
      return false;
    if (
      locationFilter.length &&
      !dto.locations.some((l) => locationFilter.includes(slugify(l)))
    )
      return false;
    if (
      categoryFilter.length &&
      !dto.categories.some((c) => categoryFilter.includes(c.id))
    )
      return false;
    return true;
  });
}

function scoreMatch(dto: OrganizationDto, q: string): number {
  const hay = [
    dto.title,
    dto.description,
    dto.organization_type,
    ...dto.locations,
    ...dto.sectors,
    ...dto.categories.map((c) => c.label),
    ...dto.services.map((s) => s.name ?? ''),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (!hay.includes(q)) return 0;
  let score = 0;
  if (dto.title.toLowerCase().includes(q)) score += 3;
  if (dto.description?.toLowerCase().includes(q)) score += 2;
  if (dto.locations.some((l) => l.toLowerCase().includes(q))) score += 1;
  if (dto.organization_type?.toLowerCase().includes(q)) score += 1;
  return score || 1;
}

export function toMapDto(dto: OrganizationDto): MapProviderDto {
  return {
    id: dto.id,
    title: dto.title,
    title_ar: dto.title_ar,
    locations: dto.locations,
    governorate: dto.governorate,
    sectors: dto.sectors,
    categories: dto.categories,
    service_count: dto.service_count,
    organization_type: dto.organization_type,
  };
}

export async function listOrganizations(
  req: Request,
  res: Response
): Promise<void> {
  const { providers, locations } = await getSnapshot();

  const q = str(req.query.search).trim().toLowerCase();
  const types = toArray(req.query.organization_type).map((s) =>
    s.toLowerCase()
  );
  const sectorFilter = toArray(req.query.sector).map(slugify);
  const locationFilter = toArray(req.query.location).map(slugify);
  const categoryFilter = toArray(req.query.category).map((s) =>
    s.toLowerCase()
  );
  const sort: Sort = req.query.sort === 'relevance' ? 'relevance' : 'az';
  const page = clampInt(req.query.page, 1);
  const pageSize = clampInt(req.query.page_size, 10, 1, 100);
  const includes = new Set(
    toArray(req.query.include).map((s) => s.toLowerCase())
  );
  const includeServices = includes.has('services');

  const mergedDtos = buildMergedDtos(providers, locations);
  const filtered = filterDtos(mergedDtos, {
    types,
    sectorFilter,
    locationFilter,
    categoryFilter,
  });

  const scored: { dto: OrganizationDto; score: number }[] = [];
  for (const dto of filtered) {
    const score = q ? scoreMatch(dto, q) : 1;
    if (q && score === 0) continue;
    scored.push({ dto, score });
  }

  scored.sort((a, b) => {
    if (sort === 'relevance' && q) return b.score - a.score;
    return a.dto.title.localeCompare(b.dto.title);
  });

  const total = scored.length;
  const start = (page - 1) * pageSize;
  const data = scored.slice(start, start + pageSize).map((s) => {
    if (includeServices) return s.dto;
    return { ...s.dto, services: [] };
  });

  res.json({ data, total, page, page_size: pageSize });
}

export async function mapListOrganizations(
  req: Request,
  res: Response
): Promise<void> {
  const { providers, locations } = await getSnapshot();

  const types = toArray(req.query.organization_type).map((s) =>
    s.toLowerCase()
  );
  const sectorFilter = toArray(req.query.sector).map(slugify);
  const locationFilter = toArray(req.query.location).map(slugify);
  const categoryFilter = toArray(req.query.category).map((s) =>
    s.toLowerCase()
  );

  const mergedDtos = buildMergedDtos(providers, locations);
  const filtered = filterDtos(mergedDtos, {
    types,
    sectorFilter,
    locationFilter,
    categoryFilter,
  });

  const groups = new Map<string, MapRegionGroup>();
  for (const dto of filtered) {
    const region = dto.locations[0]?.trim() || 'Unknown';
    const regionId = slugify(region) || 'unknown';
    let group = groups.get(regionId);
    if (!group) {
      group = { region, region_id: regionId, count: 0, listings: [] };
      groups.set(regionId, group);
    }
    const listing: MapListingDto = {
      id: dto.id,
      category: dto.sectors[0] ? slugify(dto.sectors[0]) : null,
      title: dto.title,
    };
    group.listings.push(listing);
    group.count += 1;
  }

  const data = [...groups.values()].sort((a, b) =>
    a.region.localeCompare(b.region)
  );
  res.json({ data, total: data.length });
}

export async function getOrganization(
  req: Request,
  res: Response
): Promise<void> {
  const { providers, locations } = await getSnapshot();
  const id = req.params.id;

  const mergedDtos = buildMergedDtos(providers, locations);
  const dto = mergedDtos.find((d) => d.id === id);

  if (!dto) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }

  res.json({ data: dto });
}

function pickString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

// Validates input, writes a new provider record, and invalidates the cache.
// Throws HttpError on validation failure. Shared by the admin dashboard; there
// is intentionally no unauthenticated HTTP route to this.
export async function createOrganizationRecord(
  body: Record<string, unknown>
): Promise<Provider> {
  const name = pickString(body.name);
  const nameAr = pickString(body.name_ar);
  const rawContact = pickString(body.contact_type)?.toLowerCase() ?? '';
  const contactType = rawContact === 'call' ? 'phone' : rawContact;
  const orgType = pickString(body.organization_type);

  if (!name) throw new HttpError(400, 'name is required');
  if (!nameAr) throw new HttpError(400, 'name_ar is required');
  if (!CONTACT_TYPES.has(rawContact))
    throw new HttpError(
      400,
      `contact_type must be one of: ${[...CONTACT_TYPES].join(', ')}`
    );
  if (!orgType) throw new HttpError(400, 'organization_type is required');

  const phone = pickString(body.phone_number);
  const whatsapp = pickString(body.whatsapp);
  const email = pickString(body.email);
  const district = pickString(body.district);

  const contactValue =
    contactType === 'phone'
      ? phone
      : contactType === 'whatsapp'
        ? whatsapp
        : email;
  if (!contactValue)
    throw new HttpError(
      400,
      `${rawContact === 'call' ? 'phone_number' : contactType} is required when contact_type is "${rawContact}"`
    );

  const id = randomUUID();
  const now = new Date().toISOString();
  const primary_contact: ProviderContact = {
    name: pickString(body.contact_name),
    email,
    phone: phone ?? (contactType === 'phone' ? contactValue : null),
    whatsapp: whatsapp ?? (contactType === 'whatsapp' ? contactValue : null),
  };

  const record: Provider = {
    provider_id: id,
    provider_name: name,
    provider_name_ar: nameAr,
    slug: id,
    primary_contact,
    secondary_contact: null,
    sectors: [orgType],
    districts: district ? [district] : [],
    services: [],
    service_count: 0,
    is_name_valid: true,
    pinned: false,
    verified: false,
    updated_at: now,
  };

  await getDb().ref(`entities/providers/${id}`).set(record);
  invalidateSnapshot();

  return record;
}
