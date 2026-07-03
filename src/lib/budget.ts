// The always-honest budget math. Everything the UI needs to keep a loadout
// affordable lives here so the rules are in one auditable place.
//
// The "smart filter" rule (SPEC.md): when choosing a skin for one weapon, we
// must reserve enough of the budget to still buy *something* for every other
// weapon the user armed but hasn't picked yet. So a weapon slot's spendable
// headroom is:
//
//   budget
//   − (sum of prices already committed to other picked weapons)
//   − (sum of each still-unpicked other weapon's cheapest possible skin)
//
// Headroom is now *advisory*: a skin (or a specific wear) priced above it is
// flagged in red but still equippable — the user may knowingly go over budget,
// and the sticky HUD shows the overage honestly. Headroom still powers all the
// budget-aware coloring and the per-slot "up to $X" guidance.

import type { Skin, WearPrice } from "../types/skin.ts";
import type { WeaponGroup } from "./useSkins.ts";

/** A committed choice: which skin, equipped at which specific wear. */
export interface Pick {
  skin: Skin;
  /** The exact wear equipped — its price is what counts against the budget. */
  equipped: WearPrice;
}

/** weapon name → the pick for that weapon (or null if still open). */
export type Picks = Record<string, Pick | null>;

export interface BudgetState {
  budget: number;
  /** Total committed to picked weapons so far. */
  spent: number;
  /** budget − spent. Can go negative only via stale state; UI clamps display. */
  remaining: number;
  /** Minimum possible cost of the whole loadout (sum of every weapon's floor). */
  minLoadout: number;
  /** True when even the all-cheapest loadout exceeds budget. */
  infeasible: boolean;
  /** How far over the all-cheapest floor the budget falls short (≥ 0). */
  shortfall: number;
}

export function computeBudget(
  budget: number,
  armed: WeaponGroup[],
  picks: Picks,
): BudgetState {
  let spent = 0;
  let minLoadout = 0;

  for (const w of armed) {
    minLoadout += w.floor;
    const pick = picks[w.weapon];
    if (pick) spent += pick.equipped.estPrice;
  }

  const remaining = budget - spent;
  const infeasible = budget < minLoadout - 1e-9;
  return {
    budget,
    spent,
    remaining,
    minLoadout,
    infeasible,
    shortfall: infeasible ? minLoadout - budget : 0,
  };
}

/**
 * Spendable headroom for `target`: what a single skin for this weapon may cost
 * while leaving every other armed weapon affordable. Returns -Infinity-safe
 * finite number; may be negative if the budget is already blown.
 */
export function headroomFor(
  target: WeaponGroup,
  budget: number,
  armed: WeaponGroup[],
  picks: Picks,
): number {
  let reserved = 0;
  for (const w of armed) {
    if (w.weapon === target.weapon) continue;
    const pick = picks[w.weapon];
    // committed wear price if picked, else this weapon's cheapest possible skin
    reserved += pick ? pick.equipped.estPrice : w.floor;
  }
  return budget - reserved;
}

/** Does this price sit within the slot's advisory headroom? (drives coloring) */
export function withinHeadroom(price: number, headroom: number): boolean {
  return price <= headroom + 1e-9;
}
