// The shared data model for ForceBuy.
// Imported by BOTH the ingestion script (which emits skins.json) and the
// frontend (which consumes it), so the two can never drift out of sync.

export const WEAR_ORDER = [
  "Factory New",
  "Minimal Wear",
  "Field-Tested",
  "Well-Worn",
  "Battle-Scarred",
] as const;

export type Wear = (typeof WEAR_ORDER)[number];

/** One wear tier of a skin, with its reference price and Steam listing. */
export interface WearPrice {
  wear: Wear;
  /** Skinport median price in USD — a recent reference estimate, not a live price. */
  estPrice: number;
  /** Deep link to this exact wear's Steam Community Market listing. */
  steamUrl: string;
}

/** A single gun skin, priced at skin level (cheapest available wear). */
export interface Skin {
  /** Stable slug, e.g. "ak-47-redline". */
  id: string;
  /** Full market name, e.g. "AK-47 | Redline". */
  name: string;
  /** Weapon, e.g. "AK-47". */
  weapon: string;
  /** Category, e.g. "Rifles" | "Pistols" | "SMGs" | "Heavy" | "Sniper Rifles". */
  category: string;
  /** Rarity name, e.g. "Classified". Null if unknown. */
  rarity: string | null;
  /** Steam CDN image URL. */
  image: string;
  /** Headline price = cheapest available wear's median. A reference estimate. */
  estPrice: number;
  /** Which wear the headline price came from. */
  estPriceWear: Wear;
  /** UI note reminding users the price is an estimate; buy on Steam. */
  priceNote: string;
  /** CTA: Steam market listing for the cheapest wear (the source of truth for buying). */
  steamUrl: string;
  /** Full per-wear ladder (ascending price implied by wear availability). Stretch-goal data. */
  wears: WearPrice[];
}

/** Top-level shape of public/data/skins.json. */
export interface SkinsFile {
  meta: {
    generatedAt: string;
    currency: "USD";
    priceSource: string;
    catalogSource: string;
    skinCount: number;
    /** Skins dropped for having no usable price, for data-quality monitoring. */
    droppedNoPrice: number;
  };
  skins: Skin[];
}

export const PRICE_NOTE =
  "Recent reference estimate (Skinport median). Verify on Steam.";
