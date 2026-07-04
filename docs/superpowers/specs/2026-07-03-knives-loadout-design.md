# ForceBuy — Knives Enhancement (Design)

*Status: design approved 2026-07-03. Supersedes the MVP spec's "guns only" scope
for the Knives category (see [SPEC.md](../../../SPEC.md), "Weapon roster").*

## Goal

Add CS2 **knives** — every knife type and its skins, with prices — to the loadout
builder, alongside guns.

## Guiding principle

Knives are just another weapon category. The frontend and budget math learn **no
new concepts**. The entire feature is an ingestion change plus a one-line
category-order tweak, so the already-verified gun path stays untouched.

## Locked product decisions

| Decision | Choice |
| --- | --- |
| Knife slot model | **Each knife type is its own armable weapon** (Karambit, Bayonet, Butterfly, …), exactly parallel to guns. ByMykel already labels each knife with a `weapon.name`, so each becomes a `WeaponGroup` for free. A user would rarely arm more than one, but the app imposes no special rule. |
| Price-scale UX | **Treat identically to guns — no special UI.** The existing honest budget meter and over-budget coloring already handle expensive picks. The Knives category simply renders **last** in the roster. |
| Join fix | **★-prefix normalization in the catalog adapter** (see below). Knife-scoped; guns untouched. |
| Vanilla knives | **IN (best-effort).** The plain, un-painted knife (`★ Karambit`) is a real, priced, popular item and usually a knife type's cheapest option. Contingent on the data spike confirming it exists in the catalog with wears and a price; otherwise it degrades gracefully. |
| StatTrak variants | **OUT.** Consistent with how guns are ingested today (plain price only). |
| Gloves | **OUT.** No per-weapon slot concept. |

## The core risk

`ingestion/build-skins.ts` constructs its price-join key as
`"<weapon> | <pattern> (<wear>)"` → e.g. `"Karambit | Doppler (Factory New)"`.
But on Steam/Skinport, every knife's `market_hash_name` carries a **star prefix**:
`"★ Karambit | Doppler (Factory New)"`.

So simply un-excluding the `Knives` category would make **every knife fail the
price join and get dropped** — the same failure mode that made csgobackpack.net
unusable. This must be verified before the feature is considered done.

### Chosen fix (of three considered)

1. **★-prefix normalization in the catalog adapter (CHOSEN).** In
   `catalog-source.ts`, when `category === "Knives"`, prepend `"★ "` to the
   constructed `name`. Because `name` is the single source of truth downstream,
   the join key, `steamUrl`, slug, and card name all work unchanged. Smallest,
   most localized change; guns untouched.
2. *Switch to ByMykel's own `name` field as the market name.* Rejected: changes
   the join for all ~1,400 existing guns, re-opening a risk the original spike
   already closed at 100% match, for no MVP benefit.
3. *Post-join fallback retry (try plain key, retry with `★`).* Rejected:
   overkill — adds branching to the hot loop for a case we can fully predict.

## Implementation

### Data flow (unchanged)

`ingestion/build-skins.ts` → `public/data/skins.json` → `useSkins` index → UI.
Knives ride the existing `Skin` / `WeaponGroup` / `CategoryGroup` structures with
**zero shape changes**.

### 1. Ingestion — `ingestion/catalog-source.ts` (the whole feature)

- **Un-exclude knives:** remove `"Knives"` from `EXCLUDED_CATEGORIES`. Gloves
  stay excluded.
- **★-prefix normalization:** when `category === "Knives"`, the constructed
  market name gets a `"★ "` prefix.
- **Knife-aware name construction:**
  - Painted knife → `"★ <weapon> | <pattern>"` (e.g. `★ Karambit | Doppler`)
  - Vanilla knife → `"★ <weapon>"` (no pattern segment)
- **Relax the pattern requirement for knives only:** the current
  `if (!weapon || !pattern || !category) continue;` drops vanilla blades. Change
  to require a pattern **unless** `category === "Knives"`. Guns still require a
  pattern. The `wears` requirement stays for everyone.
- Slug and dedupe already work: the existing `slug()` regex strips the star
  (`★ Karambit | Doppler` → `karambit-doppler`), and Doppler phases collapse to
  one card because Steam's `market_hash_name` does not encode phase.

### 2. Frontend — `src/lib/useSkins.ts` (one line)

Add `"Knives"` to the **end** of `CATEGORY_ORDER` so the category renders last.
Everything else — cards, columns, search, per-wear ladder, budget math,
over-budget coloring, share URLs — works with no changes.

### 3. Verification spike (step 1, before any commit)

Mirroring the original `spike/` discipline, a throwaway script confirms the two
data assumptions **before** touching the pipeline:

1. **Join match rate:** un-exclude knives, apply the `★` prefix, and measure the
   Skinport match rate across knife skins. Target: near-100%, like guns. If
   painted knives miss, the prefix logic is wrong and gets fixed before
   proceeding.
2. **Vanilla-knife feasibility:** confirm vanilla entries exist in ByMykel *with*
   `wears` *and* receive a Skinport price. If not, vanilla degrades gracefully —
   the knife's floor becomes its cheapest painted skin — and the limitation is
   noted. ("Vanilla IN" is therefore best-effort, contingent on the data.)

### 4. Testing

- Extend ingestion/unit tests to cover:
  - the `★` prefix on a knife name,
  - vanilla-knife name construction (no ` | pattern` segment),
  - a gun name is unchanged (regression guard).
- The build log already prints by-category counts; a knife count (~1000) becomes
  visible after a build as a smoke check.

## Explicitly OUT of scope

Gloves, StatTrak variants, separate knife budget, Doppler phase-level pricing,
any knife-specific UI or warnings. (Everything already out of scope in
[SPEC.md](../../../SPEC.md) remains so.)

## Files touched

- `ingestion/catalog-source.ts` — un-exclude, ★-prefix, knife-aware name, relaxed
  pattern rule.
- `src/lib/useSkins.ts` — append `"Knives"` to `CATEGORY_ORDER`.
- Tests for the above.
- A throwaway verification spike (not shipped).
