import { Request, Response } from 'express';
import { getSnapshot } from '../utils/entityStore';
import type {
  Location,
  OrganizationDto,
  Provider,
  ProviderContact,
} from '../models/Organization';

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
    const name = typeof s.name === 'string' ? s.name.trim() : '';
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

function toDto(
  p: Provider,
  _locations: Map<string, Location>
): OrganizationDto {
  const primary = p.primary_contact ?? null;
  const secondary = p.secondary_contact ?? null;
  const sectors = Array.isArray(p.sectors) ? p.sectors.filter(Boolean) : [];
  const districts = Array.isArray(p.districts)
    ? p.districts.filter(Boolean)
    : [];
  const services = Array.isArray(p.services) ? p.services : [];
  const phones = collectPhones(primary, secondary);

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
    sectors,
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

function scoreMatch(dto: OrganizationDto, q: string): number {
  const hay = [
    dto.title,
    dto.description,
    dto.organization_type,
    ...dto.locations,
    ...dto.sectors,
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
  const sort: Sort = req.query.sort === 'relevance' ? 'relevance' : 'az';
  const page = clampInt(req.query.page, 1);
  const pageSize = clampInt(req.query.page_size, 20, 1, 100);

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

  const scored: { dto: OrganizationDto; score: number }[] = [];
  for (const { dto } of seen.values()) {
    if (
      types.length &&
      !types.includes((dto.organization_type ?? '').toLowerCase())
    )
      continue;
    if (
      sectorFilter.length &&
      !dto.sectors.some((s) => sectorFilter.includes(slugify(s)))
    )
      continue;
    if (
      locationFilter.length &&
      !dto.locations.some((l) => locationFilter.includes(slugify(l)))
    )
      continue;
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
  const data = scored.slice(start, start + pageSize).map((s) => s.dto);

  res.json({ data, total, page, page_size: pageSize });
}
