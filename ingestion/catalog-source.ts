// The CATALOG source adapter — names, images, and metadata for every skin.
// Today: ByMykel's CSGO-API (free static JSON). Swappable like the price source.

import type { Wear } from "../src/types/skin.ts";

const BYMYKEL_URL =
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";

// Guns only for the MVP (SPEC.md): exclude these ByMykel categories.
const EXCLUDED_CATEGORIES = new Set(["Knives", "Gloves"]);

export const CATALOG_SOURCE_LABEL =
  "ByMykel CSGO-API skins.json (images + metadata)";

/** A gun skin from the catalog, before prices are joined on. */
export interface CatalogSkin {
  name: string; // "AK-47 | Redline"
  weapon: string; // "AK-47"
  pattern: string; // "Redline"
  category: string; // "Rifles"
  rarity: string | null;
  image: string;
  wears: Wear[];
}

interface RawSkin {
  weapon?: { name?: string };
  category?: { name?: string };
  pattern?: { name?: string };
  rarity?: { name?: string };
  image?: string;
  wears?: Array<{ name?: string }>;
  stattrak?: boolean;
  souvenir?: boolean;
}

/** Fetch and normalize the catalog to gun skins that have a pattern and wears. */
export async function fetchCatalog(): Promise<CatalogSkin[]> {
  const res = await fetch(BYMYKEL_URL);
  if (!res.ok) throw new Error(`ByMykel -> HTTP ${res.status}`);
  const raw = (await res.json()) as RawSkin[];

  const out: CatalogSkin[] = [];
  const seen = new Set<string>();

  for (const s of raw) {
    const weapon = s.weapon?.name;
    const pattern = s.pattern?.name;
    const category = s.category?.name;
    if (!weapon || !pattern || !category) continue;
    if (EXCLUDED_CATEGORIES.has(category)) continue;
    if (!Array.isArray(s.wears) || s.wears.length === 0) continue;

    const name = `${weapon} | ${pattern}`;
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
