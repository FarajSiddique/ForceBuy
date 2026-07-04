# Collapsible Arm-phase Category Sections — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each weapon category in the Arm phase (Phase 02) individually collapsible, all collapsed by default, with an armed-count badge per category and a master expand/collapse-all control — so users stop scrolling past categories they don't want.

**Architecture:** Pure presentational change confined to `ArmPhase.tsx` and `index.css`. Collapse state is local React state in `ArmPhase` (a `Set<string>` of expanded category names), not lifted into `ForceBuy`. No changes to props, data layer, budget math, or the Build phase.

**Tech Stack:** React 19 + TypeScript, Vite, plain CSS (`src/index.css`). Lint via oxlint.

## Global Constraints

- **No new dependencies.** There is no React component test framework in this repo (`npm test` runs `node --test` over `ingestion/**` only). Do NOT add vitest/testing-library. Verification for every task is: TypeScript typecheck (`npx tsc -b`), lint (`npm run lint`), and a manual check in the dev server (`npm run dev`).
- **Props into `ArmPhase` are unchanged:** `categories`, `armed`, `armedCount`, `minLoadout`, `onToggle`. Do not touch `ForceBuy.tsx`, `useSkins.ts`, or budget logic.
- **Follow existing idioms:** `<button data-*>` with CSS `[data-*]` selectors (as `.weapon-toggle[data-armed]` already does); `usd()` from `../lib/format.ts` for money; `.eyebrow` for category labels.
- Base `button {}` rule (index.css:97) only sets `font-family` + `cursor` — any element promoted to `<button>` needs its own visual reset.
- Categories come from `CATEGORY_ORDER`: Pistols, SMGs, Rifles, Heavy, Equipment, Knives.

---

## File Structure

- **`src/components/ArmPhase.tsx`** (modify) — add local `expanded` state, category toggle + master toggle handlers, promote each `.cat-label` to a `<button>`, conditionally render `.weapon-grid`, render per-category armed-count badge, render master control in `.phase-head`.
- **`src/index.css`** (modify) — restyle `.cat-label` as an interactive button row, add `.cat-chevron`, `.cat-count`, `.cat-all` styles, expanded/collapsed hooks via `[data-open]`.

Reference — the current `ArmPhase.tsx` body (lines 20–63) is the starting point. The three tasks below build up to this final component:

```tsx
import { useState } from "react";
import type { CategoryGroup } from "../lib/useSkins.ts";
import { usd } from "../lib/format.ts";

interface Props {
  categories: CategoryGroup[];
  armed: Set<string>;
  armedCount: number;
  minLoadout: number;
  onToggle: (weapon: string) => void;
}

/** Phase 02 — pick which weapons to arm, grouped by collapsible categories. */
export function ArmPhase({
  categories,
  armed,
  armedCount,
  minLoadout,
  onToggle,
}: Props) {
  // Which category sections are expanded. All collapsed on first render.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const anyOpen = expanded.size > 0;

  function toggleCategory(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function toggleAll() {
    setExpanded(
      anyOpen ? new Set() : new Set(categories.map((c) => c.category)),
    );
  }

  return (
    <section className="phase">
      <div className="phase-head">
        <span className="phase-num">02</span>
        <h2 className="phase-title">Arm your weapons</h2>
        <button type="button" className="cat-all" onClick={toggleAll}>
          {anyOpen ? "Collapse all" : "Expand all"}
        </button>
        <span className="phase-hint">one skin slot per weapon</span>
      </div>

      {categories.map((cat) => {
        const isOpen = expanded.has(cat.category);
        const armedInCat = cat.weapons.filter((g) =>
          armed.has(g.weapon),
        ).length;
        return (
          <div className="cat" key={cat.category}>
            <button
              type="button"
              className="cat-label"
              data-open={isOpen}
              aria-expanded={isOpen}
              onClick={() => toggleCategory(cat.category)}
            >
              <span className="cat-chevron" aria-hidden="true">
                ▸
              </span>
              <span className="eyebrow">{cat.category}</span>
              {armedInCat > 0 ? (
                <span className="cat-count">{armedInCat} armed</span>
              ) : null}
            </button>
            {isOpen ? (
              <div className="weapon-grid">
                {cat.weapons.map((g) => (
                  <button
                    key={g.weapon}
                    type="button"
                    className="weapon-toggle"
                    data-armed={armed.has(g.weapon)}
                    onClick={() => onToggle(g.weapon)}
                  >
                    <span className="wname">{g.weapon}</span>
                    <span className="wfloor">from {usd(g.floor)}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}

      {armedCount > 0 ? (
        <div className="arm-summary">
          <span>
            <b>{armedCount}</b> armed
          </span>
          <span>
            min loadout <span className="lime money">{usd(minLoadout)}</span>
          </span>
        </div>
      ) : (
        <div className="arm-summary">Select at least one weapon to build.</div>
      )}
    </section>
  );
}
```

---

## Task 1: Collapsible category sections (state + header button + conditional grid)

Promote each category label to a toggle button, hold expand state locally, all collapsed by default. No badge, no master toggle yet.

**Files:**
- Modify: `src/components/ArmPhase.tsx`
- Modify: `src/index.css` (restyle `.cat-label` as a button, add `.cat-chevron`, `[data-open]` hooks)

**Interfaces:**
- Consumes: `ArmPhase` props `categories: CategoryGroup[]`, `armed: Set<string>`, `armedCount`, `minLoadout`, `onToggle` (unchanged). `usd` from `../lib/format.ts`.
- Produces: local state `expanded: Set<string>` and `toggleCategory(name: string)` used by later tasks; CSS classes `.cat-label` (now a button) and `.cat-chevron`.

- [ ] **Step 1: Add state and the category toggle handler**

At the top of the `ArmPhase` component body (after the destructured props, before `return`), add the import and state. Change line 1 of the file from `import type { CategoryGroup }...` so the file also imports `useState`:

```tsx
import { useState } from "react";
import type { CategoryGroup } from "../lib/useSkins.ts";
import { usd } from "../lib/format.ts";
```

Inside the component, above the `return`:

```tsx
  // Which category sections are expanded. All collapsed on first render.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleCategory(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }
```

- [ ] **Step 2: Promote the category header to a button and gate the grid**

Replace the current category map body (lines 28–48, the `categories.map(...)` block) with:

```tsx
      {categories.map((cat) => {
        const isOpen = expanded.has(cat.category);
        return (
          <div className="cat" key={cat.category}>
            <button
              type="button"
              className="cat-label"
              data-open={isOpen}
              aria-expanded={isOpen}
              onClick={() => toggleCategory(cat.category)}
            >
              <span className="cat-chevron" aria-hidden="true">
                ▸
              </span>
              <span className="eyebrow">{cat.category}</span>
            </button>
            {isOpen ? (
              <div className="weapon-grid">
                {cat.weapons.map((g) => (
                  <button
                    key={g.weapon}
                    type="button"
                    className="weapon-toggle"
                    data-armed={armed.has(g.weapon)}
                    onClick={() => onToggle(g.weapon)}
                  >
                    <span className="wname">{g.weapon}</span>
                    <span className="wfloor">from {usd(g.floor)}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
```

- [ ] **Step 3: Restyle `.cat-label` as a button and add the chevron**

In `src/index.css`, replace the existing `.cat-label` rule (currently lines 357–371, the `.cat-label` block plus `.cat-label .eyebrow` and `.cat-label::after`) with:

```css
.cat-label {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 0.7rem;
  width: 100%;
  padding: 0.15rem 0;
  background: none;
  border: none;
  color: inherit;
  text-align: left;
  font: inherit;
}
.cat-label .eyebrow {
  color: var(--muted);
  transition: color 0.15s;
}
.cat-label:hover .eyebrow {
  color: var(--ink);
}
.cat-label::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--line);
}
.cat-chevron {
  color: var(--dim);
  font-size: 0.7rem;
  transition: transform 0.15s;
}
.cat-label[data-open="true"] .cat-chevron {
  transform: rotate(90deg);
}
```

- [ ] **Step 4: Typecheck, lint**

Run: `npx tsc -b`
Expected: no errors.

Run: `npm run lint`
Expected: no new errors in `ArmPhase.tsx`.

- [ ] **Step 5: Manual verification in the dev server**

Run: `npm run dev`, open the app, enter a budget so Phase 02 appears.
Expected: all six categories show as collapsed header rows (chevron ▸ + name + divider line), **no weapon grids visible**. Clicking a category header reveals its weapon grid and rotates the chevron to ▾; clicking again hides it. Arming weapons inside an open category still works (orange highlight + ✓).

- [ ] **Step 6: Commit**

```bash
git add src/components/ArmPhase.tsx src/index.css
git commit -m "feat: collapsible category sections in Arm phase"
```

---

## Task 2: Per-category armed-count badge

Show an `N armed` badge on a collapsed/open category header when that category has one or more armed weapons.

**Files:**
- Modify: `src/components/ArmPhase.tsx`
- Modify: `src/index.css` (add `.cat-count`)

**Interfaces:**
- Consumes: `armed: Set<string>` prop, `cat.weapons` from Task 1's map.
- Produces: `.cat-count` badge element in each category header.

- [ ] **Step 1: Compute the per-category armed count and render the badge**

In the `categories.map` callback (from Task 1), add the count next to `isOpen`:

```tsx
        const isOpen = expanded.has(cat.category);
        const armedInCat = cat.weapons.filter((g) =>
          armed.has(g.weapon),
        ).length;
```

Then inside the `.cat-label` button, after the `.eyebrow` span, add the badge:

```tsx
              <span className="eyebrow">{cat.category}</span>
              {armedInCat > 0 ? (
                <span className="cat-count">{armedInCat} armed</span>
              ) : null}
```

Note: the `.cat-label::after` divider (flex:1) sits between the eyebrow and the badge, pushing the badge to the right edge.

- [ ] **Step 2: Style the badge**

In `src/index.css`, directly after the `.cat-label[data-open="true"] .cat-chevron` rule from Task 1, add:

```css
.cat-count {
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  color: var(--orange);
  white-space: nowrap;
}
```

- [ ] **Step 3: Typecheck, lint**

Run: `npx tsc -b`
Expected: no errors.

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, enter a budget. Expand a category, arm 2 weapons, collapse it.
Expected: the collapsed header shows `2 armed` in orange on the right. A category with nothing armed shows no badge. The count updates live as you arm/disarm.

- [ ] **Step 5: Commit**

```bash
git add src/components/ArmPhase.tsx src/index.css
git commit -m "feat: armed-count badge on Arm-phase category headers"
```

---

## Task 3: Master expand/collapse-all control

Add a single button in the phase head that expands every category when all are collapsed, and collapses everything when any is open.

**Files:**
- Modify: `src/components/ArmPhase.tsx`
- Modify: `src/index.css` (add `.cat-all`)

**Interfaces:**
- Consumes: `expanded`/`setExpanded` state and `categories` from Task 1.
- Produces: `anyOpen` boolean, `toggleAll()` handler, `.cat-all` button in `.phase-head`.

- [ ] **Step 1: Add the `anyOpen` flag and `toggleAll` handler**

In the component body, right after the `expanded` state declaration, add:

```tsx
  const anyOpen = expanded.size > 0;
```

And after `toggleCategory`, add:

```tsx
  function toggleAll() {
    setExpanded(
      anyOpen ? new Set() : new Set(categories.map((c) => c.category)),
    );
  }
```

- [ ] **Step 2: Render the master control in the phase head**

In the `.phase-head` div, insert the button between the `<h2 className="phase-title">` and the `<span className="phase-hint">`:

```tsx
      <div className="phase-head">
        <span className="phase-num">02</span>
        <h2 className="phase-title">Arm your weapons</h2>
        <button type="button" className="cat-all" onClick={toggleAll}>
          {anyOpen ? "Collapse all" : "Expand all"}
        </button>
        <span className="phase-hint">one skin slot per weapon</span>
      </div>
```

Note: `.phase-hint` has `margin-left: auto` (index.css:249), which pushes both the master button and the hint to the right side of the head row. The `.cat-all` rule below sits the button just left of the hint.

- [ ] **Step 3: Style the master control**

In `src/index.css`, after the `.cat-count` rule from Task 2, add:

```css
.cat-all {
  font-family: var(--mono);
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
  background: none;
  border: 1px solid var(--line-strong);
  border-radius: 3px;
  padding: 0.3rem 0.6rem;
  transition:
    color 0.15s,
    border-color 0.15s;
}
.cat-all:hover {
  color: var(--ink);
  border-color: var(--orange);
}
```

- [ ] **Step 4: Typecheck, lint**

Run: `npx tsc -b`
Expected: no errors.

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, enter a budget.
Expected: with everything collapsed the button reads **Expand all**; clicking it opens all six grids and the label flips to **Collapse all**; clicking again closes them all. Opening a single category via its own header also flips the master label to **Collapse all** (because `anyOpen` is now true).

- [ ] **Step 6: Commit**

```bash
git add src/components/ArmPhase.tsx src/index.css
git commit -m "feat: master expand/collapse-all control for Arm phase"
```

---

## Self-Review

**Spec coverage:**
- Category-level collapse → Task 1. ✓
- All-collapsed default (`new Set()` initial state) → Task 1. ✓
- Name + armed-count badge, only when count > 0 → Task 2. ✓
- Master expand/collapse-all toggle → Task 3. ✓
- State local to `ArmPhase`, ephemeral, `ForceBuy` untouched → Task 1 (state in component). ✓
- React state over `<details>` → Task 1 (`Set<string>` + conditional render). ✓
- Accessibility: `<button aria-expanded>`, chevron `aria-hidden`, labelled master button → Tasks 1 & 3. ✓
- Out of scope (persistence, Build phase, ordering) → not touched. ✓
- Testing: no component harness exists; verification via typecheck/lint/manual is documented in Global Constraints and each task. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Type consistency:** `expanded: Set<string>`, `setExpanded`, `toggleCategory(name: string)`, `anyOpen`, `toggleAll()`, `armedInCat` used consistently across tasks. CSS class names (`.cat-label`, `.cat-chevron`, `.cat-count`, `.cat-all`, `[data-open]`) match between JSX and CSS. ✓
