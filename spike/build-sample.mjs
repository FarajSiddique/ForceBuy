// Build a SMALL, human-reviewable skins.sample.json by joining
// ByMykel (catalog + images) with Skinport (prices).
// Output shape here is a PROPOSAL for the real Skin data model.
// Run: node spike/build-sample.mjs

import { writeFileSync } from "node:fs";

const BYMYKEL = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";
const SKINPORT = "https://api.skinport.com/v1/items?currency=USD&app_id=730";

// A representative slice across categories for review.
const REVIEW_WEAPONS = ["AK-47", "AWP", "M4A4", "USP-S", "Glock-18", "MAC-10"];
// For each weapon, show this many skins picked to span the price range (low/mid/high...).
const PER_WEAPON = 3;

const WEAR_ORDER = ["Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"];
const round = (n) => Math.round(n * 100) / 100;
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

const steamUrl = (marketHashName) =>
  `https://steamcommunity.com/market/listings/730/${encodeURIComponent(marketHashName)}`;

async function main() {
  const [skins, market] = await Promise.all([getJSON(BYMYKEL), getJSON(SKINPORT)]);

  // Skinport lookup: market_hash_name -> estimate price.
  // median_price = representative "what it typically goes for" (avoids min_price outliers).
  const priceOf = new Map();
  for (const it of market) {
    const p = it.median_price ?? it.min_price ?? it.suggested_price;
    if (typeof p === "number" && p > 0) priceOf.set(it.market_hash_name, p);
  }

  // Build a full record per gun skin: cheapest price + per-wear ladder.
  function toRecord(s) {
    const weapon = s.weapon.name;
    const pattern = s.pattern.name;
    const name = `${weapon} | ${pattern}`;

    const ladder = [];
    for (const w of s.wears ?? []) {
      const wear = w.name ?? w;
      const mhn = `${name} (${wear})`;
      const p = priceOf.get(mhn);
      if (p != null) ladder.push({ wear, estPrice: round(p), steamUrl: steamUrl(mhn) });
    }
    ladder.sort((a, b) => WEAR_ORDER.indexOf(a.wear) - WEAR_ORDER.indexOf(b.wear));
    if (ladder.length === 0) return null;

    const cheapest = ladder.reduce((a, b) => (b.estPrice < a.estPrice ? b : a));
    return {
      id: slug(name),
      name,
      weapon,
      category: s.category?.name ?? null,
      rarity: s.rarity?.name ?? null,
      image: s.image,
      // Headline = cheapest available wear (skin-level rule). NOT a live price:
      // a recent reference estimate; users buy on Steam (the source of truth).
      estPrice: cheapest.estPrice,
      estPriceWear: cheapest.wear,
      priceNote: "Recent reference estimate (Skinport median). Verify on Steam.",
      steamUrl: cheapest.steamUrl, // the CTA
      // Stretch-goal data: the expandable wear ladder.
      wears: ladder,
    };
  }

  const byWeapon = new Map(REVIEW_WEAPONS.map((w) => [w, []]));
  for (const s of skins) {
    if (!s.pattern || !s.weapon?.name) continue;
    if (!byWeapon.has(s.weapon.name)) continue;
    const rec = toRecord(s);
    if (rec) byWeapon.get(s.weapon.name).push(rec);
  }

  // Pick PER_WEAPON skins per weapon spread across the price range (low..high).
  const chosen = [];
  for (const [weapon, list] of byWeapon) {
    list.sort((a, b) => a.estPrice - b.estPrice);
    if (list.length === 0) continue;
    const picks = [];
    for (let i = 0; i < PER_WEAPON; i++) {
      const idx = Math.round((i / (PER_WEAPON - 1)) * (list.length - 1));
      picks.push(list[idx]);
    }
    chosen.push(...picks.filter((v, i, a) => a.indexOf(v) === i)); // dedupe if list short
  }

  const out = {
    _meta: {
      note: "SAMPLE for human review — small curated slice, not the full dataset.",
      generatedAt: new Date().toISOString(),
      currency: "USD",
      priceSource: "Skinport /v1/items (median_price) — reference estimate only",
      catalogSource: "ByMykel CSGO-API skins.json (images + metadata)",
      skinLevelPriceRule: "headline price = cheapest available wear",
      weaponsInSample: REVIEW_WEAPONS,
      skinCount: chosen.length,
    },
    skins: chosen,
  };

  const path = "spike/skins.sample.json";
  writeFileSync(path, JSON.stringify(out, null, 2));
  console.log(`Wrote ${chosen.length} skins to ${path}`);
  console.log("Price spread by weapon:");
  for (const [weapon, list] of byWeapon) {
    const inSample = chosen.filter((c) => c.weapon === weapon);
    console.log(
      `  ${weapon.padEnd(9)}: ${inSample.map((c) => `$${c.estPrice}`).join(", ")}  (from ${list.length} total)`
    );
  }
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
