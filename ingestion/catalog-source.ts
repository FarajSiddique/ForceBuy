// The CATALOG source adapter — names, images, and metadata for every skin.
// Today: ByMykel's CSGO-API (free static JSON). Swappable like the price source.

import type { Wear } from "../src/types/skin.ts";

const BYMYKEL_URL =
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";

// Guns + knives for MVP: gloves have no per-weapon slot concept, so stay excluded.
const KNIFE_CATEGORY = "Knives";
const EXCLUDED_CATEGORIES = new Set(["Gloves"]);

export const CATALOG_SOURCE_LABEL =
  "ByMykel CSGO-API skins.json (images + metadata)";

/** A skin from the catalog, before prices are joined on. */
export interface CatalogSkin {
  name: string; // "AK-47 | Redline" or "★ Karambit | Doppler" or "★ Karambit"
  weapon: string; // "AK-47" / "Karambit"
  pattern: string | null; // null for vanilla knives
  category: string; // "Rifles" / "Knives"
  rarity: string | null;
  image: string;
  wears: Wear[];
}

export interface RawSkin {
  weapon?: { name?: string };
  category?: { name?: string };
  pattern?: { name?: string };
  rarity?: { name?: string };
  image?: string;
  wears?: Array<{ name?: string }>;
  stattrak?: boolean;
  souvenir?: boolean;
}

/** Fetch the raw catalog and normalize it to usable skins. */
export async function fetchCatalog(): Promise<CatalogSkin[]> {
  const res = await fetch(BYMYKEL_URL);
  if (!res.ok) throw new Error(`ByMykel -> HTTP ${res.status}`);
  const raw = (await res.json()) as RawSkin[];
  return normalizeCatalog(raw);
}

/**
 * Pure transform: raw ByMykel entries -> catalog skins.
 * Guns must have a pattern; knives may be vanilla (no pattern) and get a
 * "★ " prefix so their name matches Skinport's market_hash_name.
 */
export function normalizeCatalog(raw: RawSkin[]): CatalogSkin[] {
  const out: CatalogSkin[] = [];
  const seen = new Set<string>();

  for (const s of raw) {
    const weapon = s.weapon?.name;
    const category = s.category?.name;
    const pattern = s.pattern?.name ?? null;
    if (!weapon || !category) continue;
    if (EXCLUDED_CATEGORIES.has(category)) continue;

    const isKnife = category === KNIFE_CATEGORY;
    if (!pattern && !isKnife) continue; // guns require a pattern; vanilla knives don't
    if (!Array.isArray(s.wears) || s.wears.length === 0) continue;

    const star = isKnife ? "★ " : "";
    const name = pattern ? `${star}${weapon} | ${pattern}` : `${star}${weapon}`;
    if (seen.has(name)) continue; // ByMykel has a few duplicate entries
    seen.add(name);

    out.push({
      name,
      weapon,
      pattern,
      category,
      rarity: s.rarity?.name ?? null,
      image: s.image ?? "",
      wears: s.wears.map((w) => w.name).filter((w): w is Wear => !!w),
    });
  }
  return out;
}
