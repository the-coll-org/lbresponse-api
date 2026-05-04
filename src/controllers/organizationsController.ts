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

function isValidLebanesePhone(text: string): boolean {
  let digits = text.replace(/\D/g, '');
  if (digits.startsWith('961')) digits = digits.slice(3);
  if (digits.length < 7 || digits.length > 8) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  if (digits.startsWith('00')) return false;
  return true;
}

function extractPhoneNumbers(p: Provider): string[] {
  const candidates: string[] = [];
  if (Array.isArray(p.contact_phones)) {
    candidates.push(
      ...p.contact_phones.filter((n): n is string => typeof n === 'string')
    );
  }
  if (typeof p.contact_phone === 'string') {
    candidates.push(...p.contact_phone.split(','));
  }
  const seen = new Set<string>();
  const valid: string[] = [];
  for (const raw of candidates) {
    const trimmed = raw.trim();
    if (!trimmed || !isValidLebanesePhone(trimmed)) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    valid.push(trimmed);
  }
  return valid;
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

function extractWhatsapp(p: Provider): string | null {
  if (typeof p.whatsapp === 'string' && p.whatsapp.trim()) {
    const trimmed = p.whatsapp.trim();
    if (isValidLebanesePhone(trimmed)) return trimmed;
  }
  const social = Array.isArray(p.social_media_accounts)
    ? p.social_media_accounts
    : [];
  for (const entry of social) {
    if (typeof entry !== 'string') continue;
    const match = entry.match(
      /(?:wa\.me\/|whatsapp\.com\/(?:send\?phone=)?)\+?(\d+)/i
    );
    if (match) {
      const digits = match[1];
      const normalized = digits.startsWith('961')
        ? '0' + digits.slice(3)
        : digits;
      if (isValidLebanesePhone(normalized)) return normalized;
    }
  }
  return null;
}

function buildMapUrl(
  locationIds: string[] | null | undefined,
  locations: Map<string, Location>,
  fallbackLabel: string
): string | null {
  if (Array.isArray(locationIds)) {
    for (const id of locationIds) {
      const loc = locations.get(id);
      if (
        loc &&
        typeof loc.latitude === 'number' &&
        typeof loc.longitude === 'number'
      ) {
        return `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`;
      }
    }
  }
  if (fallbackLabel.trim()) {
    return `https://www.google.com/maps?q=${encodeURIComponent(fallbackLabel + ', Lebanon')}`;
  }
  return null;
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

function toDto(p: Provider, locations: Map<string, Location>): OrganizationDto {
  const locs = (p.location_ids ?? [])
    .map((id) => locations.get(id))
    .filter((l): l is Location => Boolean(l))
    .map((l) => [l.city, l.governorate].filter(Boolean).join(', '))
    .filter(Boolean);

  const phones = extractPhoneNumbers(p);

  return {
    id: p.provider_id,
    title: p.provider_name,
    title_ar: p.provider_name_ar ?? null,
    description: p.description ?? null,
    description_ar: p.description_ar ?? null,
    email: p.email ?? null,
    verified: Boolean(p.verified),
    phone_numbers: phones,
    whatsapp: extractWhatsapp(p),
    social_media: extractSocialMedia(p),
    type: p.contact_type ?? null,
    locations: locs,
    map_url: buildMapUrl(p.location_ids, locations, locs[0] ?? ''),
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

  const seen = new Map<string, { dto: OrganizationDto; isSplit: boolean }>();
  for (const p of providers) {
    for (const expanded of expandToDtos(p, locations)) {
      const key = expanded.dto.title.toLowerCase().trim();
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
