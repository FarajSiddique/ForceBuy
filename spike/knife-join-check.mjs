// Throwaway spike to close the KNIFE join risk: with a "★ " prefix on knife
// market names, do ByMykel knife skins match Skinport prices cleanly? And do
// vanilla knives (no pattern) exist with wears + a price?
// Run: node spike/knife-join-check.mjs

const BYMYKEL = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";
const SKINPORT = "https://api.skinport.com/v1/items?currency=USD&app_id=730";

async function getJSON(url) {
  const res = await fetch(url, { headers: { "Accept-Encoding": "br" } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

const round = (n) => Math.round(n * 100) / 100;

async function main() {
  console.log("Fetching both feeds...");
  const [skins, market] = await Promise.all([getJSON(BYMYKEL), getJSON(SKINPORT)]);

  const priceOf = new Map();
  for (const it of market) {
    const p = it.median_price ?? it.min_price ?? it.suggested_price;
    if (typeof p === "number" && p > 0) priceOf.set(it.market_hash_name, p);
  }

  // Knives only, must have wears. Vanilla (no pattern) allowed.
  const knives = skins.filter(
    (s) =>
      s.category?.name === "Knives" &&
      s.weapon?.name &&
      Array.isArray(s.wears) &&
      s.wears.length > 0,
  );

  let matched = 0, vanillaTotal = 0, vanillaMatched = 0;
  const misses = [];
  const hits = [];
  const seen = new Set();

  for (const s of knives) {
    const weapon = s.weapon.name;
    const pattern = s.pattern?.name ?? null;
    const name = pattern ? `★ ${weapon} | ${pattern}` : `★ ${weapon}`;
    if (seen.has(name)) continue;
    seen.add(name);
    if (!pattern) vanillaTotal++;

    const priced = [];
    for (const w of s.wears) {
      const wear = w.name ?? w;
      const p = priceOf.get(`${name} (${wear})`);
      if (p != null) priced.push(p);
    }
    if (priced.length) {
      matched++;
      if (!pattern) vanillaMatched++;
      if (hits.length < 10) hits.push({ name, from: round(Math.min(...priced)) });
    } else if (misses.length < 15) {
      misses.push(`${name} (${s.wears[0]?.name ?? s.wears[0]})`);
    }
  }

  console.log("\n==================== KNIFE JOIN RESULTS ====================");
  console.log(`Distinct knife skins (has wears)      : ${seen.size}`);
  console.log(`  ...priced on Skinport with ★ prefix : ${matched}`);
  console.log(`Match rate: ${round((matched / seen.size) * 100)}%`);
  console.log(`Vanilla knives: ${vanillaTotal} total, ${vanillaMatched} priced`);
  console.log("\n--- 10 MATCHED knife samples (what a card would show) ---");
  for (const h of hits) console.log(`  $${h.from.toFixed(2).padStart(9)}  ${h.name}`);
  console.log("\n--- up to 15 MISSES (diagnose prefix issues) ---");
  for (const m of misses) console.log(`  MISS: ${m}`);
}

main().catch((e) => {
  console.error("SPIKE FAILED:", e.message);
  process.exit(1);
});
