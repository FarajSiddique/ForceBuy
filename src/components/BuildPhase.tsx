import type { Skin, WearPrice } from "../types/skin.ts";
import type { WeaponGroup } from "../lib/useSkins.ts";
import { headroomFor, type BudgetState, type Picks } from "../lib/budget.ts";
import { usd } from "../lib/format.ts";
import { WeaponSlot } from "./WeaponSlot.tsx";

interface Props {
  armedGroups: WeaponGroup[];
  budget: number;
  picks: Picks;
  budgetState: BudgetState;
  pickedCount: number;
  openWeapon: string | null;
  onToggle: (weapon: string) => void;
  onEquip: (weapon: string, skin: Skin, wear: WearPrice) => void;
  onClear: (weapon: string) => void;
}

/** Phase 03 — one WeaponSlot per armed weapon, plus the tight-budget notice. */
export function BuildPhase({
  armedGroups,
  budget,
  picks,
  budgetState,
  pickedCount,
  openWeapon,
  onToggle,
  onEquip,
  onClear,
}: Props) {
  return (
    <section className="phase">
      <div className="phase-head">
        <span className="phase-num">03</span>
        <h2 className="phase-title">Build the loadout</h2>
        <span className="phase-hint">
          {pickedCount}/{armedGroups.length} equipped
        </span>
      </div>

      {budgetState.infeasible ? (
        <div className="notice warn" style={{ marginBottom: "0.9rem" }}>
          <b>Heads up — budget's tight.</b> The cheapest possible skin for every
          armed weapon totals {usd(budgetState.minLoadout)}, which is{" "}
          {usd(budgetState.shortfall)} over your {usd(budget)}. You can still
          equip and go over, or raise the budget / disarm a weapon.
        </div>
      ) : null}

      <div className="slots">
        {armedGroups.map((g, i) => (
          <WeaponSlot
            key={g.weapon}
            group={g}
            index={i}
            open={openWeapon === g.weapon}
            pick={picks[g.weapon] ?? null}
            headroom={headroomFor(g, budget, armedGroups, picks)}
            onToggle={onToggle}
            onEquip={onEquip}
            onClear={onClear}
          />
        ))}
      </div>
    </section>
  );
}
