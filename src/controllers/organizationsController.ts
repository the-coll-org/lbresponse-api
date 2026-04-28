import { Request, Response } from 'express';
import { getSnapshot } from '../utils/entityStore';
import type {
  Location,
  OrganizationDto,
  Provider,
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

function extractPhoneNumbers(p: Provider): string[] {
  if (Array.isArray(p.contact_phones) && p.contact_phones.length > 0) {
    return p.contact_phones.filter(
      (n) => typeof n === 'string' && n.trim() !== ''
    );
  }
  if (typeof p.contact_phone === 'string' && p.contact_phone.trim() !== '') {
    return p.contact_phone
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);
  }
  return [];
}

function extractSocialMedia(p: Provider): string[] {
  if (
    Array.isArray(p.social_media_accounts) &&
    p.social_media_accounts.length > 0
  ) {
    return p.social_media_accounts.filter(
      (s) => typeof s === 'string' && s.trim() !== ''
    );
  }
  return [];
}

function toDto(p: Provider, locations: Map<string, Location>): OrganizationDto {
  const locs = (p.location_ids ?? [])
    .map((id) => locations.get(id))
    .filter((l): l is Location => Boolean(l))
    .map((l) => [l.city, l.governorate].filter(Boolean).join(', '))
    .filter(Boolean);

  return {
    id: p.provider_id,
    title: p.provider_name,
    title_ar: p.provider_name_ar ?? null,
    description: p.description ?? null,
    description_ar: p.description_ar ?? null,
    email: p.email ?? null,
    verified: Boolean(p.verified),
    phone_numbers: extractPhoneNumbers(p),
    social_media: extractSocialMedia(p),
    type: p.contact_type ?? null,
    locations: locs,
    organization_type: p.provider_type ?? null,
    updated_at: p.updated_at ?? p.created_at ?? null,
  };
}

function scoreMatch(dto: OrganizationDto, q: string): number {
  const hay = [
    dto.title,
    dto.description,
    dto.organization_type,
    ...dto.locations,
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
  const locationFilter = toArray(req.query.location).map((s) =>
    s.toLowerCase()
  );
  const sort: Sort = req.query.sort === 'relevance' ? 'relevance' : 'az';
  const page = clampInt(req.query.page, 1);
  const pageSize = clampInt(req.query.page_size, 20, 1, 100);

  const scored: { dto: OrganizationDto; score: number }[] = [];
  for (const p of providers) {
    const dto = toDto(p, locations);
    if (
      types.length &&
      !types.includes((dto.organization_type ?? '').toLowerCase())
    )
      continue;
    if (
      locationFilter.length &&
      !dto.locations.some((l) =>
        locationFilter.some((f) => l.toLowerCase().includes(f))
      )
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
