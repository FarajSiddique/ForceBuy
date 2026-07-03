# ForceBuy — CS2 Budget Loadout Builder (MVP Spec)

*"Force-buy" (CS economy slang): spending a limited budget on the best gear you can afford — exactly what this app helps players do with skins.*

**ForceBuy** is a stateless web app where a CS2 player sets a **total dollar budget**, picks the
guns they want skins for, and interactively builds an affordable loadout (one skin
per weapon) with a live, always-honest budget meter.

Status: spec locked 2026-07-03. Research risks #1 (data) and #2 (per-wear prices)
verified GREEN via `spike/`. No app code yet beyond the spike.

## Core product decisions

| Decision | Choice |
| --- | --- |
| Budget meaning | Single **total** across all selected weapons (not per-weapon). |
| Interaction model | Interactive **loadout builder** — no full-combination enumeration; each weapon column filters against remaining budget. |
| Smart filter | Always **reserves the absolute-cheapest skin cost** of unpicked weapons, so the user can never strand themselves into an unfinishable loadout. Drives an honest live "remaining budget". |
| Weapon roster | **Guns only** for MVP (no knives/gloves — they alone exceed a typical budget). |
| Infeasible selection | Explicit message: "The cheapest skins for your selection total $X, over your $Y budget — remove a weapon or raise the budget." |
| Skin granularity | **Skin-level**: one card per skin, priced at its **cheapest available wear**. |
| Price meaning | A **recent reference estimate only** (not a live price). Presented with a "verify on Steam" note. |
| Call to action | **Deep-link each skin to its Steam Community Market page.** Steam is the source of truth for buying; the app is a planning/estimation tool. No purchasing in-app. |
| Flow | **Single page, progressive reveal**: budget input + category-grouped weapon toggle grid → builder appears below. Sticky budget bar. |
| Column UX | Image cards, **price-descending** default sort, simple text search, **collapse-to-selection** when a skin is picked. |
| Responsive | Desktop-first; columns **stack vertically** on mobile (just-usable, not mobile-first). |
| Accounts / persistence | **None.** Fully stateless. Optional share via **URL-encoded loadout state**. |

### Stretch goal (gated, verified feasible)
Expandable **per-wear price ladder** on a single skin card (option A — stays
skin-level, one card per skin). Confirmed feasible: Skinport prices are keyed by
`market_hash_name` which includes the wear, so per-wear prices exist for free.
Build only after the core works.

## Architecture

- **Static site + prebuilt `skins.json`.** No live backend at request time.
- **Scheduled ingestion** (GitHub Action, **daily**) rebuilds `skins.json` and
  deploys it. Ingestion is a **swappable boundary** (paid price source can drop in later).
- **React + Vite + TypeScript** throughout. Shared `Skin` type between ingestion
  output and frontend. One repo.
- All budget/filter logic runs **client-side** (dataset is small — ~1,400 gun skins).

## Data pipeline (verified in `spike/`)

Ingestion is a **join of two free sources** (csgobackpack.net is DEAD — do not use):

1. **Catalog + images + metadata** — ByMykel CSGO-API
   `https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json`
   Gives `weapon.name`, `pattern.name`, `category.name`, `rarity`, `wears[]`,
   `image` (Steam CDN), stattrak/souvenir flags. No prices.
2. **Prices** — Skinport public API
   `https://api.skinport.com/v1/items?currency=USD&app_id=730`
   Gives `median_price` (chosen for stability over the outlier-prone `min_price`),
   keyed by full `market_hash_name`.

**Join:** construct `"<weapon> | <pattern> (<wear>)"` and look up the Skinport price.
Spike result: **100% match** across 1,418 gun skins, **0 dropped**.

### Ingestion rules
- Refresh **daily**. USD only.
- Filter to guns: exclude ByMykel `category.name` in {Knives, Gloves}; require `pattern` + `wears`.
- Price = **cheapest wear's `median_price`** (skin-level headline).
- **Drop** any skin with no usable price (spike showed this is ~none).
- Images from ByMykel; Steam icon-URL fallback if ever absent.
- Steam CTA URL: `https://steamcommunity.com/market/listings/730/<urlencoded market_hash_name>`.

## Proposed `Skin` record shape (from `spike/skins.sample.json`)

```jsonc
{
  "id": "ak-47-redline",
  "name": "AK-47 | Redline",
  "weapon": "AK-47",
  "category": "Rifles",
  "rarity": "Classified",
  "image": "https://community.akamai.steamstatic.com/economy/image/...",
  "estPrice": 31.15,                    // cheapest-wear median; a reference estimate
  "estPriceWear": "Well-Worn",
  "priceNote": "Recent reference estimate (Skinport median). Verify on Steam.",
  "steamUrl": "https://steamcommunity.com/market/listings/730/AK-47%20%7C%20Redline%20(Well-Worn)",
  "wears": [                            // stretch-goal ladder
    { "wear": "Well-Worn", "estPrice": 31.15, "steamUrl": "..." }
  ]
}
```

Note on outliers: because the headline uses the **cheapest** wear, an anomalously
*high* per-wear value can never become the headline — outlier risk is confined to
the optional wear ladder.

## Explicitly OUT of scope for MVP
User accounts, saved loadouts/history, in-app purchasing, knives & gloves,
third-party marketplace links, price alerts/wishlists, multi-currency,
float-value precision, popularity data, full mobile-first design.

## Open human checks (not blockers to scaffolding)
1. Spot-check 2–3 skins' Skinport `median_price` vs Steam for 2026 sanity.
2. Skim Skinport API terms (`https://docs.skinport.com`) for comfort using the free endpoint.
