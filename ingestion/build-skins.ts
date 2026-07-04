// ForceBuy data build: join the catalog (images/metadata) with prices and emit
// public/data/skins.json — the single file the static frontend consumes.
// Run: npm run build:data

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  WEAR_ORDER,
  PRICE_NOTE,
  type Skin,
  type SkinsFile,
  type WearPrice,
} from "../src/types/skin.ts";
import { fetchCatalog, CATALOG_SOURCE_LABEL } from "./catalog-source.ts";
import { fetchPrices, PRICE_SOURCE_LABEL, type PriceMap } from "./price-source.ts";

const OUT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "data",
  "skins.json",
);

const round = (n: number) => Math.round(n * 100) / 100;

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const steamUrl = (marketHashName: string) =>
  `https://steamcommunity.com/market/listings/730/${encodeURIComponent(marketHashName)}`;

/** Build the per-wear price ladder for one skin from the price map. */
function buildLadder(
  name: string,
  wears: readonly string[],
  prices: PriceMap,
): WearPrice[] {
  const ladder: WearPrice[] = [];
  for (const wear of wears) {
    const mhn = `${name} (${wear})`;
    const p = prices.get(mhn);
    if (p != null) {
      ladder.push({
        wear: wear as WearPrice["wear"],
        estPrice: round(p),
        steamUrl: steamUrl(mhn),
      });
    }
  }
  ladder.sort(
    (a, b) => WEAR_ORDER.indexOf(a.wear) - WEAR_ORDER.indexOf(b.wear),
  );
  return ladder;
}

async function main() {
  console.log("Fetching catalog + prices...");
  const [catalog, prices] = await Promise.all([fetchCatalog(), fetchPrices()]);
  console.log(`  catalog: ${catalog.length} catalog skins`);
  console.log(`  prices : ${prices.size} priced market items`);

  const skins: Skin[] = [];
  let droppedNoPrice = 0;

  for (const c of catalog) {
    const ladder = buildLadder(c.name, c.wears, prices);
    if (ladder.length === 0) {
      droppedNoPrice++;
      continue;
    }
    const cheapest = ladder.reduce((a, b) => (b.estPrice < a.estPrice ? b : a));
    skins.push({
      id: slug(c.name),
      name: c.name,
      weapon: c.weapon,
      category: c.category,
      rarity: c.rarity,
      image: c.image,
      estPrice: cheapest.estPrice,
      estPriceWear: cheapest.wear,
      priceNote: PRICE_NOTE,
      steamUrl: cheapest.steamUrl,
      wears: ladder,
    });
  }

  skins.sort((a, b) => a.name.localeCompare(b.name));

  const file: SkinsFile = {
    meta: {
      generatedAt: new Date().toISOString(),
      currency: "USD",
      priceSource: PRICE_SOURCE_LABEL,
      catalogSource: CATALOG_SOURCE_LABEL,
      skinCount: skins.length,
      droppedNoPrice,
    },
    skins,
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(file));

  console.log(`\nWrote ${skins.length} skins -> public/data/skins.json`);
  console.log(`Dropped (no usable price): ${droppedNoPrice}`);
  const byCat = new Map<string, number>();
  for (const s of skins) byCat.set(s.category, (byCat.get(s.category) ?? 0) + 1);
  console.log("By category:");
  for (const [cat, n] of [...byCat].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(16)} ${n}`);
  }
}

main().catch((e) => {
  console.error("BUILD FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
