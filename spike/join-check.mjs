// Throwaway spike to close RISK #1: can we join ByMykel (catalog+images)
// to Skinport (prices) cleanly enough to build the app's skins.json?
// Run: node spike/join-check.mjs

const BYMYKEL = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";
const SKINPORT = "https://api.skinport.com/v1/items?currency=USD&app_id=730";

const EXCLUDED_CATEGORIES = new Set(["Knives", "Gloves"]); // guns-only MVP

async function getJSON(url) {
  const res = await fetch(url, { headers: { "Accept-Encoding": "br" } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

function buildName(weapon, pattern, wear, { stattrak = false, souvenir = false } = {}) {
  const prefix = stattrak ? "StatTrak™ " : souvenir ? "Souvenir " : "";
  return `${prefix}${weapon} | ${pattern} (${wear})`;
}

const round = (n) => Math.round(n * 100) / 100;

async function main() {
  console.log("Fetching both feeds...");
  const [skins, market] = await Promise.all([getJSON(BYMYKEL), getJSON(SKINPORT)]);

  console.log(`ByMykel skins.json : ${skins.length} entries`);
  console.log(`Skinport items     : ${market.length} entries`);
  console.log("\n--- sample ByMykel skin object ---");
  console.log(JSON.stringify(skins.find((s) => s.pattern) ?? skins[0], null, 2).slice(0, 900));
  console.log("\n--- sample Skinport item ---");
  console.log(JSON.stringify(market[0], null, 2));

  // Price lookup by exact market_hash_name; keep min_price when present.
  const priceOf = new Map();
  for (const it of market) {
    const p = it.min_price ?? it.median_price ?? it.suggested_price;
    if (typeof p === "number" && p > 0) priceOf.set(it.market_hash_name, p);
  }

  // Filter to gun skins that actually have a pattern (skip vanilla) and wears.
  const guns = skins.filter(
    (s) =>
      s.pattern &&
      Array.isArray(s.wears) &&
      s.wears.length > 0 &&
      s.weapon?.name &&
      !EXCLUDED_CATEGORIES.has(s.category?.name)
  );

  let matched = 0;
  const unmatchedSamples = [];
  const matchedSamples = [];

  for (const s of guns) {
    const weapon = s.weapon.name;
    const pattern = s.pattern.name;
    const variantPrices = [];
    for (const w of s.wears) {
      const wear = w.name ?? w;
      for (const opts of [{}, { stattrak: true }, s.souvenir ? { souvenir: true } : null].filter(Boolean)) {
        const name = buildName(weapon, pattern, wear, opts);
        const price = priceOf.get(name);
        if (price != null) variantPrices.push({ name, price });
      }
    }
    if (variantPrices.length) {
      matched++;
      const cheapest = variantPrices.reduce((a, b) => (b.price < a.price ? b : a));
      if (matchedSamples.length < 10)
        matchedSamples.push({ skin: `${weapon} | ${pattern}`, from: round(cheapest.price), image: s.image?.slice(0, 60) + "..." });
    } else if (unmatchedSamples.length < 12) {
      unmatchedSamples.push(buildName(weapon, pattern, s.wears[0]?.name ?? s.wears[0]));
    }
  }

  const catalog = new Set(guns.map((s) => `${s.weapon.name} | ${s.pattern.name}`));
  console.log("\n==================== JOIN RESULTS ====================");
  console.log(`Distinct gun skins (guns-only, has pattern+wears): ${catalog.size}`);
  console.log(`  ...with >=1 priced variant on Skinport         : ${matched}`);
  console.log(`  ...dropped (no usable price)                   : ${guns.length - matched}`);
  console.log(`Match rate: ${round((matched / guns.length) * 100)}%`);

  console.log("\n--- 10 MATCHED samples (what a card would show) ---");
  for (const m of matchedSamples) console.log(`  $${m.from.toFixed(2).padStart(7)}  ${m.skin}`);

  console.log("\n--- up to 12 UNMATCHED names (to diagnose name mismatches) ---");
  for (const n of unmatchedSamples) console.log(`  MISS: ${n}`);
}

main().catch((e) => {
  console.error("SPIKE FAILED:", e.message);
  process.exit(1);
});
