import { useMemo, useState } from "react";
import { useSkins, type SkinIndex, type WeaponGroup } from "./lib/useSkins.ts";
import { computeBudget, headroomFor, type Picks } from "./lib/budget.ts";
import { usd } from "./lib/format.ts";
import { WeaponSlot } from "./components/WeaponSlot.tsx";
import type { Skin, WearPrice } from "./types/skin.ts";

const QUICK_BUDGETS = [25, 50, 100, 250, 500];

export default function App() {
  const load = useSkins();

  if (load.status === "loading") {
    return (
      <div className="center-state">
        <span className="blink">▍</span>
        <span>Loading skin catalog…</span>
      </div>
    );
  }
  if (load.status === "error") {
    return (
      <div className="center-state">
        <span style={{ color: "var(--red)" }}>Failed to load skins</span>
        <span>{load.message}</span>
      </div>
    );
  }

  // Once data is ready, hand off to a component whose hooks can run freely.
  return <ForceBuy index={load.index} />;
}

function ForceBuy({ index }: { index: SkinIndex }) {
  const [budgetRaw, setBudgetRaw] = useState("");
  const [armed, setArmed] = useState<Set<string>>(new Set());
  const [picks, setPicks] = useState<Picks>({});
  const [openWeapon, setOpenWeapon] = useState<string | null>(null);

  const budget = Math.max(0, Number(budgetRaw) || 0);

  // Armed weapon groups, kept in the catalog's category order.
  const armedGroups: WeaponGroup[] = useMemo(() => {
    const out: WeaponGroup[] = [];
    for (const cat of index.categories) {
      for (const g of cat.weapons) {
        if (armed.has(g.weapon)) out.push(g);
      }
    }
    return out;
  }, [index.categories, armed]);

  const budgetState = useMemo(
    () => computeBudget(budget, armedGroups, picks),
    [budget, armedGroups, picks],
  );

  const pickedCount = armedGroups.filter((g) => picks[g.weapon]).length;

  function toggleArm(weapon: string) {
    setArmed((prev) => {
      const next = new Set(prev);
      if (next.has(weapon)) {
        next.delete(weapon);
        setPicks((p) => {
          const np = { ...p };
          delete np[weapon];
          return np;
        });
        if (openWeapon === weapon) setOpenWeapon(null);
      } else {
        next.add(weapon);
      }
      return next;
    });
  }

  function nextUnpicked(after: string): string | null {
    const idx = armedGroups.findIndex((g) => g.weapon === after);
    for (let i = 1; i <= armedGroups.length; i++) {
      const g = armedGroups[(idx + i) % armedGroups.length];
      if (g.weapon !== after && !picks[g.weapon]) return g.weapon;
    }
    return null;
  }

  function handleEquip(weapon: string, skin: Skin, wear: WearPrice) {
    setPicks((p) => ({ ...p, [weapon]: { skin, equipped: wear } }));
    setOpenWeapon(nextUnpicked(weapon));
  }

  function handleClear(weapon: string) {
    setPicks((p) => {
      const np = { ...p };
      delete np[weapon];
      return np;
    });
    setOpenWeapon(weapon);
  }

  function reset() {
    setBudgetRaw("");
    setArmed(new Set());
    setPicks({});
    setOpenWeapon(null);
  }

  const showArm = budget > 0;
  const showBuild = showArm && armedGroups.length > 0;

  const spentPct =
    budget > 0 ? Math.min(100, (budgetState.spent / budget) * 100) : 0;
  const over = budgetState.remaining < -1e-9 || budgetState.infeasible;

  return (
    <>
      <div className="app">
        {/* -------- Masthead -------- */}
        <header className="masthead">
          <h1 className="wordmark">
            <span className="a">FORCE</span>
            <span className="b">BUY</span>
            <span className="cursor" aria-hidden="true" />
          </h1>
          <p className="sub">CS2 Budget Loadout Builder</p>
          <div className="metastrip">
            <span>
              <b>{index.meta.skinCount.toLocaleString()}</b> skins
            </span>
            <span>prices · Skinport median</span>
            <span>
              updated{" "}
              <b>
                {new Date(index.meta.generatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </b>
            </span>
          </div>
        </header>

        {/* -------- Phase 1 · Budget -------- */}
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
                onChange={(e) => setBudgetRaw(e.target.value)}
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
                    onClick={() => setBudgetRaw(String(b))}
                  >
                    ${b}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* -------- Phase 2 · Arm weapons -------- */}
        {showArm ? (
          <section className="phase">
            <div className="phase-head">
              <span className="phase-num">02</span>
              <h2 className="phase-title">Arm your weapons</h2>
              <span className="phase-hint">one skin slot per weapon</span>
            </div>

            {index.categories.map((cat) => (
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
                      onClick={() => toggleArm(g.weapon)}
                    >
                      <span className="wname">{g.weapon}</span>
                      <span className="wfloor">from {usd(g.floor)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {armedGroups.length > 0 ? (
              <div className="arm-summary">
                <span>
                  <b>{armedGroups.length}</b> armed
                </span>
                <span>
                  min loadout{" "}
                  <span className="lime money">
                    {usd(budgetState.minLoadout)}
                  </span>
                </span>
              </div>
            ) : (
              <div className="arm-summary">
                Select at least one weapon to build.
              </div>
            )}
          </section>
        ) : null}

        {/* -------- Phase 3 · Build -------- */}
        {showBuild ? (
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
                <b>Heads up — budget's tight.</b> The cheapest possible skin for
                every armed weapon totals {usd(budgetState.minLoadout)}, which is{" "}
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
                  onToggle={() =>
                    setOpenWeapon(openWeapon === g.weapon ? null : g.weapon)
                  }
                  onEquip={(skin, wear) => handleEquip(g.weapon, skin, wear)}
                  onClear={() => handleClear(g.weapon)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* -------- Footer -------- */}
        <footer className="footer">
          Prices are recent reference estimates (Skinport median), not live
          quotes. The source of truth for buying is always the{" "}
          <a
            href="https://steamcommunity.com/market/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Steam Community Market
          </a>
          . ForceBuy is a planning tool — verify every price on Steam before you
          buy. Not affiliated with Valve or Steam.
        </footer>
      </div>

      {/* -------- Sticky Budget HUD -------- */}
      {showArm ? (
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
              <span
                className="v remain money"
                data-neg={budgetState.remaining < 0}
              >
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
                  {pickedCount}/{armedGroups.length} equipped
                </span>
                <span className={over ? "over" : ""}>
                  {over
                    ? "over budget"
                    : `${Math.round(spentPct)}% of budget used`}
                </span>
              </div>
            </div>

            <button type="button" className="hud-reset" onClick={reset}>
              Reset
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
