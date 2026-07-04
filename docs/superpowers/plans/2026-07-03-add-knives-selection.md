# Add Knives Selection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CS2 knives (every knife type and its skins, with prices) to the loadout builder alongside guns.

**Architecture:** Knives are just another weapon category. The frontend and budget math learn no new concepts. The whole feature is an ingestion change — un-exclude the `Knives` category and prefix knife market names with `★` so they join to Skinport prices — plus a one-line category-order tweak so Knives render last. The already-verified gun path stays untouched.

**Tech Stack:** TypeScript, React 19, Vite 8, Node 24 (native `.ts` execution + built-in `node --test` runner). Data pipeline joins ByMykel CSGO-API (catalog/images) with the Skinport public API (prices).

## Global Constraints

- ESM only — repo is `"type": "module"`. No CommonJS.
- **Zero new dependencies.** Tests use Node's built-in `node:test` + `node:assert/strict`. No Jest, no ts-node, no vitest.
- `.ts` runs directly under Node 24 (native type stripping) — the same way `npm run build:data` already runs. No build step for scripts.
- Prices are **Skinport median**, USD only, a reference estimate (not live). Consistent with existing guns.
- Keep `oxlint` clean (`npm run lint`).
- StatTrak variants and gloves stay **out of scope**.
- Full design: `docs/superpowers/specs/2026-07-03-knives-loadout-design.md`.

---

### Task 1: Verification spike (GATE)

Throwaway investigation — no TDD. Confirms the two data assumptions **before** touching the real pipeline: (1) knife names join to Skinport prices once prefixed with `★`, and (2) whether vanilla knives exist with wears + a price. This is a **go/no-go gate**: a near-100% match rate for painted knives is required to proceed; the vanilla number just tells us how many un-painted blades will survive.

**Files:**
- Create: `spike/knife-join-check.mjs`

**Interfaces:**
- Consumes: nothing (standalone script hitting two public APIs).
- Produces: console output only — a decision, not shipped code.

- [ ] **Step 1: Write the spike script**

Create `spike/knife-join-check.mjs`:

```js
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
```

- [ ] **Step 2: Run the spike**

Run: `node spike/knife-join-check.mjs`

Expected: a match rate at or near **100%** for painted knives (like the original guns spike). Example shape:
```
Distinct knife skins (has wears)      : ~1050
  ...priced on Skinport with ★ prefix : ~1040
Match rate: ~99%
Vanilla knives: ~19 total, ~19 priced
```

**GATE decision:**
- Match rate near 100% → the `★` prefix is correct. **Proceed to Task 2.**
- Many `MISS:` lines instead → the prefix/name logic is wrong (e.g. Skinport uses a different glyph or spacing). **Stop.** Inspect the `MISS:` names against real Skinport `market_hash_name` values, correct the name construction, and re-run before proceeding. Do not touch the real pipeline until this passes.
- `Vanilla knives: N total, 0 priced` → vanilla blades simply won't survive the price join; that's the documented graceful-degradation case. Still proceed — no code change needed (Task 2 handles it either way).

- [ ] **Step 3: Commit the spike**

```bash
git add spike/knife-join-check.mjs
git commit -m "spike: verify knife name join to Skinport with ★ prefix"
```

---

### Task 2: Knife-aware catalog normalization

Extract the catalog transform into a pure, testable `normalizeCatalog` function, then teach it about knives: include the `Knives` category, prefix knife market names with `★`, and allow vanilla knives (no pattern). Guns are unaffected. Covered by `node:test` unit tests.

**Files:**
- Modify: `ingestion/catalog-source.ts` (rewrite the `CatalogSkin.pattern` type, the exclusion set, and split `fetchCatalog` into fetch + pure `normalizeCatalog`)
- Create: `ingestion/catalog-source.test.ts`
- Modify: `package.json` (add a `test` script)

**Interfaces:**
- Consumes: `RawSkin` (existing internal interface in `catalog-source.ts`), `Wear` (from `src/types/skin.ts`).
- Produces:
  - `export function normalizeCatalog(raw: RawSkin[]): CatalogSkin[]` — pure, no I/O.
  - `RawSkin` becomes **exported** so the test can build fixtures.
  - `CatalogSkin.pattern` becomes `string | null` (vanilla knives have no pattern). Downstream `build-skins.ts` does not read `pattern`, so this is safe.

- [ ] **Step 1: Add a `test` script to package.json**

In `package.json`, add to `"scripts"`:

```json
    "test": "node --test \"ingestion/**/*.test.ts\"",
```

- [ ] **Step 2: Write the failing tests**

Create `ingestion/catalog-source.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCatalog, type RawSkin } from "./catalog-source.ts";

const fn = (name: string) => ({ name });
const oneWear = [{ name: "Factory New" }];

test("gun keeps its plain name and pattern", () => {
  const raw: RawSkin[] = [
    {
      weapon: fn("AK-47"),
      pattern: fn("Redline"),
      category: fn("Rifles"),
      wears: [{ name: "Field-Tested" }],
    },
  ];
  const out = normalizeCatalog(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, "AK-47 | Redline");
  assert.equal(out[0].pattern, "Redline");
});

test("painted knife gets a ★ prefix", () => {
  const raw: RawSkin[] = [
    {
      weapon: fn("Karambit"),
      pattern: fn("Doppler"),
      category: fn("Knives"),
      wears: oneWear,
    },
  ];
  const out = normalizeCatalog(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, "★ Karambit | Doppler");
});

test("vanilla knife (no pattern) is kept as ★ <weapon>", () => {
  const raw: RawSkin[] = [
    { weapon: fn("Karambit"), category: fn("Knives"), wears: oneWear },
  ];
  const out = normalizeCatalog(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, "★ Karambit");
  assert.equal(out[0].pattern, null);
});

test("gun without a pattern is dropped", () => {
  const raw: RawSkin[] = [
    { weapon: fn("AK-47"), category: fn("Rifles"), wears: oneWear },
  ];
  assert.equal(normalizeCatalog(raw).length, 0);
});

test("gloves are still excluded", () => {
  const raw: RawSkin[] = [
    {
      weapon: fn("Sport Gloves"),
      pattern: fn("Pandora's Box"),
      category: fn("Gloves"),
      wears: oneWear,
    },
  ];
  assert.equal(normalizeCatalog(raw).length, 0);
});

test("entries without wears are dropped", () => {
  const raw: RawSkin[] = [
    {
      weapon: fn("Karambit"),
      pattern: fn("Fade"),
      category: fn("Knives"),
      wears: [],
    },
  ];
  assert.equal(normalizeCatalog(raw).length, 0);
});

test("duplicate names collapse to one entry", () => {
  const dup: RawSkin = {
    weapon: fn("Karambit"),
    pattern: fn("Doppler"),
    category: fn("Knives"),
    wears: oneWear,
  };
  assert.equal(normalizeCatalog([dup, dup]).length, 1);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `normalizeCatalog` and the exported `RawSkin` don't exist yet (import error / "does not provide an export named 'normalizeCatalog'").

- [ ] **Step 4: Refactor `catalog-source.ts` to a pure `normalizeCatalog` and make it knife-aware**

In `ingestion/catalog-source.ts`:

Change the exclusion set (knives are now included; only gloves excluded):

```ts
// Guns + knives for MVP: gloves have no per-weapon slot concept, so stay excluded.
const KNIFE_CATEGORY = "Knives";
const EXCLUDED_CATEGORIES = new Set(["Gloves"]);
```

Make `pattern` nullable on the output type (vanilla knives have no pattern):

```ts
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
```

Export `RawSkin` so tests can build fixtures:

```ts
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
```

Replace the body of `fetchCatalog` with a fetch that delegates to a new pure function, and add `normalizeCatalog`:

```ts
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
```

Delete the now-inlined old loop/`interface RawSkin` (non-exported) so there's exactly one `RawSkin` and one build loop.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all 7 tests green.

- [ ] **Step 6: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add ingestion/catalog-source.ts ingestion/catalog-source.test.ts package.json
git commit -m "feat(ingestion): include knives with ★-prefixed names"
```

---

### Task 3: Render Knives last + regenerate data

Add `Knives` to the frontend category order so the section renders last, then rebuild `skins.json` from the live sources (now including knives) and commit the refreshed data so the shipped app shows knives.

**Files:**
- Modify: `src/lib/useSkins.ts:11` (`CATEGORY_ORDER`)
- Modify: `public/data/skins.json` (regenerated by `npm run build:data`)

**Interfaces:**
- Consumes: `normalizeCatalog` behavior from Task 2 (knives now flow through `build:data`).
- Produces: nothing new for later tasks — this is the final integration step.

- [ ] **Step 1: Add "Knives" to the category order**

In `src/lib/useSkins.ts`, line 11:

```ts
const CATEGORY_ORDER = ["Pistols", "SMGs", "Rifles", "Heavy", "Equipment", "Knives"];
```

- [ ] **Step 2: Typecheck + production build**

Run: `npm run build`
Expected: PASS — `tsc -b` reports no type errors (confirms the `pattern: string | null` change didn't break any consumer) and `vite build` succeeds.

- [ ] **Step 3: Regenerate skins.json from live sources**

Run: `npm run build:data`
Expected: the by-category log now includes a `Knives` row (~1000, exact number depends on live Skinport coverage), and `Dropped (no usable price)` stays small. Example tail:
```
Wrote ~2450 skins -> public/data/skins.json
Dropped (no usable price): <small>
By category:
  Rifles           ...
  Pistols          ...
  Knives           ~1040
  ...
```
If `Knives` is absent or 0, stop — revisit Task 2 (the prefix/exclusion change didn't take). This is the real end-to-end confirmation of the Task 1 spike.

- [ ] **Step 4: Smoke-check the running app**

Run: `npm run dev`, open the local URL, enter a budget (e.g. `500`), and confirm a **Knives** section appears last in "Arm your weapons" with knife toggles (Karambit, Bayonet, …). Arm one, open its column, confirm knife skin cards show a price and a "verify on Steam" link. Stop the dev server.

- [ ] **Step 5: Commit code + refreshed data**

```bash
git add src/lib/useSkins.ts public/data/skins.json
git commit -m "feat: show knives in the loadout builder"
```

Note: `public/data/skins.json` is minified single-line JSON, so this is a large diff — expected. The daily auto-update workflow will keep it fresh from here.

---

## Self-Review

**Spec coverage:**
- Each knife type = its own weapon → achieved for free: knives flow through the existing per-`weapon` grouping (`useSkins` groups by `skin.weapon`); no code needed beyond un-excluding the category (Task 2) — ✎ covered.
- Treat identically, Knives category last → Task 3 Step 1 (`CATEGORY_ORDER`) — covered.
- ★-prefix join fix → Task 2 Step 4 + verified in Task 1 — covered.
- Vanilla knives IN (best-effort) → Task 2 relaxed-pattern logic + tests; feasibility surfaced by Task 1 spike; graceful drop if unpriced via existing `buildLadder` → `droppedNoPrice` — covered.
- StatTrak / gloves OUT → gloves stay in `EXCLUDED_CATEGORIES`; no StatTrak handling added — covered.
- Testing (name prefix, vanilla name, gun-unchanged regression) → Task 2 Step 2 — covered.
- Verification spike as a gate → Task 1 — covered.

**Placeholder scan:** No TBD/TODO; every code step shows complete code; every run step shows an expected result. Clean.

**Type consistency:** `normalizeCatalog(raw: RawSkin[]): CatalogSkin[]`, `RawSkin` exported, `CatalogSkin.pattern: string | null` — used consistently across Task 2 (definition + tests) and relied on unchanged by `build-skins.ts` (which never reads `pattern`). `CATEGORY_ORDER` string `"Knives"` matches the ByMykel `category.name` used in `EXCLUDED_CATEGORIES`/`KNIFE_CATEGORY`. Consistent.
