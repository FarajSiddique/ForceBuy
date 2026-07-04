import type { CategoryGroup } from "../lib/useSkins.ts";
import { usd } from "../lib/format.ts";

interface Props {
  categories: CategoryGroup[];
  armed: Set<string>;
  armedCount: number;
  minLoadout: number;
  onToggle: (weapon: string) => void;
}

/** Phase 02 — pick which weapons to arm, grouped by category. */
export function ArmPhase({
  categories,
  armed,
  armedCount,
  minLoadout,
  onToggle,
}: Props) {
  return (
    <section className="phase">
      <div className="phase-head">
        <span className="phase-num">02</span>
        <h2 className="phase-title">Arm your weapons</h2>
        <span className="phase-hint">one skin slot per weapon</span>
      </div>

      {categories.map((cat) => (
        <div className="cat" key={cat.category}>
          <div className="cat-label">
            <span className="eyebrow">{cat.category}</span>
          </div>
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
        </div>
      ))}

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
