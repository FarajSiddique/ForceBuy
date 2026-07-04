# Collapsible category sections in the Arm phase

**Date:** 2026-07-04
**Branch:** `weapon-collapseables`

## Problem

The Arm phase (Phase 02, `ArmPhase.tsx`) renders all six weapon categories —
Pistols, SMGs, Rifles, Heavy, Equipment, Knives — fully expanded, one grid of
weapon toggles after another. A user who only wants, say, rifles still has to
scroll past every other category. There is a lot of unnecessary scrolling.

## Goal

Make each category section collapsible so the user can open only the categories
they care about, with a master control to expand/collapse everything at once.

## Decisions

- **Granularity:** collapse at the **category** level (Pistols, SMGs, Rifles,
  Heavy, Equipment, Knives), plus a single **master toggle** for the whole phase.
- **Default state:** **all categories collapsed** when the Arm phase first
  appears. Minimal scrolling immediately; the user opens what they want.
- **Collapsed header content:** category **name + armed-count badge** (e.g.
  `RIFLES · 2 armed`). The badge appears **only when the armed count > 0**, so
  untouched categories stay quiet. This is the key feedback that keeps
  selections visible while everything starts collapsed.
- **State ownership:** collapse/expand state lives **locally in `ArmPhase`**
  (via `useState`), not lifted into `ForceBuy`. It is purely presentational and
  has no cross-cutting logic (unlike `openWeapon`, which drives
  equip-then-advance behaviour in `ForceBuy`). The state is **ephemeral**: it
  resets if the phase unmounts (budget → 0). That is acceptable.
- **Implementation:** React state (a `Set<string>` of expanded category names),
  **not** native `<details>`/`<summary>`. The master toggle needs central
  control over every section's open state anyway, so native uncontrolled
  behaviour would just have to be re-synced; React state keeps it consistent
  with the existing `<button data-armed>` idiom and avoids cross-browser
  `<summary>` marker styling.

## UI

Collapsed / mixed example:

```
▸  RIFLES                              2 armed
─────────────────────────────────────────────
▸  PISTOLS
─────────────────────────────────────────────
▾  SMGS                                 1 armed
   [ MAC-10 ] [ MP9 ] [ P90 ] ...   ← weapon grid, shown only when expanded
```

- **Category header** is a full-width clickable `<button>` (the existing
  `.cat-label` becomes the button). Contains:
  - a chevron that rotates `▸ → ▾` on expand,
  - the category name (existing `.eyebrow`),
  - the armed-count badge on the right (only when count > 0).
- **Weapon grid** (`.weapon-grid`) renders only when the category is expanded.
- **Master control:** a button in the phase head (near the "Arm your weapons"
  title / hint) reading **Expand all** when everything is collapsed and
  **Collapse all** when any category is open. It sets the expanded set to all
  category names or the empty set accordingly.

## Component / data changes

- **`ArmPhase.tsx`**
  - Add `const [expanded, setExpanded] = useState<Set<string>>(new Set())`
    (all collapsed initially).
  - `toggleCategory(name)` — add/remove from the set.
  - Master toggle — if `expanded.size > 0` collapse all (empty set), else expand
    all (every `cat.category`).
  - Per category, compute `armedInCat = cat.weapons.filter(g => armed.has(g.weapon)).length`
    for the badge. `armed` is already a prop.
  - Wrap `.cat-label` as a `<button>` with `aria-expanded`; conditionally render
    the `.weapon-grid`.
- **No changes** to `ForceBuy.tsx`, `useSkins.ts`, budget logic, or the data
  layer. Props into `ArmPhase` are unchanged (`categories`, `armed`,
  `armedCount`, `minLoadout`, `onToggle`).
- **`index.css`** — restyle `.cat-label` as an interactive button row, add
  chevron + badge styles, add an expanded/collapsed data-attribute hook, style
  the master toggle. Keep the existing divider look (`.cat-label::after`).

## Accessibility

- Category header is a real `<button>` with `aria-expanded={isOpen}` and is
  keyboard-focusable/activatable.
- Chevron is decorative (CSS/`aria-hidden`), state conveyed by `aria-expanded`.
- Master toggle is a labelled `<button>`.

## Out of scope

- Persisting collapse state across page reloads or the URL share link.
- Any change to the Build phase (Phase 03) accordion (`openWeapon`).
- Changing category order, weapon grouping, or the arming behaviour itself.

## Testing

- Manual: enter a budget, confirm all categories start collapsed with no grids
  shown; expand one, arm a weapon, collapse it, confirm the `N armed` badge
  reflects the selection; master toggle flips all; badge hidden when count is 0.
- If component tests exist for `ArmPhase`, add coverage for: default-collapsed
  render, toggling a category reveals/hides its grid, badge count reflects
  `armed`, master toggle expands/collapses all.
