const QUICK_BUDGETS = [25, 50, 100, 250, 500];

interface Props {
  budgetRaw: string;
  onBudgetChange: (value: string) => void;
}

/** Phase 01 — the total-budget input plus quick-set chips. */
export function BudgetPhase({ budgetRaw, onBudgetChange }: Props) {
  return (
    <section className="phase">
      <div className="phase-head">
        <span className="phase-num">01</span>
        <h2 className="phase-title">Set your budget</h2>
        <span className="phase-hint">total, across every weapon</span>
      </div>

      <div className="budget-panel">
        <div className="budget-field">
          <span className="glyph">$</span>
          <input
            className="budget-input"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="0"
            value={budgetRaw}
            onChange={(e) => onBudgetChange(e.target.value)}
            aria-label="Total budget in US dollars"
            autoFocus
          />
        </div>
        <div className="budget-side">
          <span className="eyebrow">Quick set</span>
          <div className="chips">
            {QUICK_BUDGETS.map((b) => (
              <button
                key={b}
                type="button"
                className="chip"
                onClick={() => onBudgetChange(String(b))}
              >
                ${b}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
