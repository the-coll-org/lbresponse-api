import { getDb } from '../config/firebase';
import type {
  CategoryRecord,
  Location,
  Provider,
} from '../models/Organization';

interface Snapshot {
  providers: Provider[];
  locations: Map<string, Location>;
  categories: Record<string, CategoryRecord[]>;
  fetchedAt: number;
}

const TTL_MS = 60_000;
let cache: Snapshot | null = null;
let pending: Promise<Snapshot> | null = null;

async function load(): Promise<Snapshot> {
  const db = getDb();
  const [providersSnap, locationsSnap, categoriesSnap] = await Promise.all([
    db.ref('entities/providers').once('value'),
    db.ref('entities/locations').once('value'),
    db.ref('categories').once('value'),
  ]);

  const providers = Object.values(
    (providersSnap.val() as Record<string, Provider> | null) ?? {}
  );
  const locations = new Map(
    Object.entries(
      (locationsSnap.val() as Record<string, Location> | null) ?? {}
    )
  );
  const rawCats =
    (categoriesSnap.val() as Record<
      string,
      Record<string, CategoryRecord>
    > | null) ?? {};

  const categories: Record<string, CategoryRecord[]> = Object.fromEntries(
    Object.entries(rawCats).map(([type, entries]) => [
      type,
      Object.values(entries).sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      ),
    ])
  );

  return { providers, locations, categories, fetchedAt: Date.now() };
}

export async function getSnapshot(): Promise<Snapshot> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) return cache;
  if (pending) return pending;
  pending = load()
    .then((s) => {
      cache = s;
      return s;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function invalidateSnapshot(): void {
  cache = null;
}
