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

/** Phase 02 — pick which weapons to arm, grouped by category. */
export function ArmPhase({
  categories,
  armed,
  armedCount,
  minLoadout,
  onToggle,
}: Props) {
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

  return (
    <section className="phase">
      <div className="phase-head">
        <span className="phase-num">02</span>
        <h2 className="phase-title">Arm your weapons</h2>
        <span className="phase-hint">one skin slot per weapon</span>
      </div>

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
