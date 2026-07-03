// The PRICE SOURCE adapter — the swappable boundary from SPEC.md.
// Today: Skinport's free public API. To move to a paid provider later,
// reimplement fetchPrices() to return the same Map; nothing else changes.

/** market_hash_name -> reference price (USD). */
export type PriceMap = Map<string, number>;

const SKINPORT_URL =
  "https://api.skinport.com/v1/items?currency=USD&app_id=730";

interface SkinportItem {
  market_hash_name: string;
  min_price: number | null;
  median_price: number | null;
  suggested_price: number | null;
}

export const PRICE_SOURCE_LABEL =
  "Skinport /v1/items (median_price) — reference estimate only";

/**
 * Fetch a price for every market item. We use `median_price` (a representative
 * "what it typically goes for") rather than the outlier-prone `min_price`.
 */
export async function fetchPrices(): Promise<PriceMap> {
  const res = await fetch(SKINPORT_URL);
  if (!res.ok) throw new Error(`Skinport -> HTTP ${res.status}`);
  const items = (await res.json()) as SkinportItem[];

  const prices: PriceMap = new Map();
  for (const it of items) {
    const p = it.median_price ?? it.min_price ?? it.suggested_price;
    if (typeof p === "number" && p > 0) prices.set(it.market_hash_name, p);
  }
  return prices;
}
