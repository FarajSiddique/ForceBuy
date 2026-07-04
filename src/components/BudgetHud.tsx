import { type BudgetState } from "../lib/budget.ts";
import { usd } from "../lib/format.ts";

interface Props {
  budget: number;
  budgetState: BudgetState;
  pickedCount: number;
  armedCount: number;
  onOpenSummary: () => void;
  onReset: () => void;
}

/** Sticky bottom HUD — live budget/spent/remaining, progress meter, actions. */
export function BudgetHud({
  budget,
  budgetState,
  pickedCount,
  armedCount,
  onOpenSummary,
  onReset,
}: Props) {
  const spentPct =
    budget > 0 ? Math.min(100, (budgetState.spent / budget) * 100) : 0;
  const over = budgetState.remaining < -1e-9 || budgetState.infeasible;

  return (
    <div className="hud" role="status" aria-live="polite">
      <div className="hud-inner">
        <div className="hud-stat">
          <span className="k">Budget</span>
          <span className="v money">{usd(budget)}</span>
        </div>
        <div className="hud-stat">
          <span className="k">Spent</span>
          <span className="v spent money">{usd(budgetState.spent)}</span>
        </div>
        <div className="hud-stat">
          <span className="k">{over ? "Over by" : "Remaining"}</span>
          <span className="v remain money" data-neg={budgetState.remaining < 0}>
            {usd(Math.abs(budgetState.remaining))}
          </span>
        </div>

        <div className="hud-meter">
          <div className="hud-track">
            <div
              className="hud-fill"
              data-over={over}
              style={{ width: `${over ? 100 : spentPct}%` }}
            />
          </div>
          <div className="hud-meta">
            <span>
              {pickedCount}/{armedCount} equipped
            </span>
            <span className={over ? "over" : ""}>
              {over ? "over budget" : `${Math.round(spentPct)}% of budget used`}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="hud-summary"
          data-ready={pickedCount > 0 && pickedCount === armedCount}
          onClick={onOpenSummary}
          disabled={pickedCount === 0}
        >
          Loadout
        </button>
        <button type="button" className="hud-reset" onClick={onReset}>
          Reset
        </button>
      </div>
    </div>
  );
}
