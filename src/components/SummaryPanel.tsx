import { useEffect, useMemo, useState } from "react";
import type { WeaponGroup } from "../lib/useSkins.ts";
import { type BudgetState, type Picks } from "../lib/budget.ts";
import { encodeLoadout } from "../lib/share.ts";
import { usd } from "../lib/format.ts";

interface Props {
  budget: number;
  budgetState: BudgetState;
  armedGroups: WeaponGroup[]; // category-ordered
  picks: Picks;
  onClose: () => void;
}

type Copied = "" | "link" | "text";

export function SummaryPanel({
  budget,
  budgetState,
  armedGroups,
  picks,
  onClose,
}: Props) {
  const [copied, setCopied] = useState<Copied>("");

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const equipped = armedGroups.filter((g) => picks[g.weapon]);
  const unequipped = armedGroups.length - equipped.length;

  const shareUrl = useMemo(() => {
    const qs = encodeLoadout(budget, picks);
    const { origin, pathname } = window.location;
    return `${origin}${pathname}${qs ? `?${qs}` : ""}`;
  }, [budget, picks]);

  const textSummary = useMemo(() => {
    const lines: string[] = [];
    lines.push(
      `FORCEBUY LOADOUT — ${usd(budgetState.spent)} spent / ${usd(budget)} budget`,
      "",
    );
    let cat = "";
    for (const g of equipped) {
      const pick = picks[g.weapon];
      if (!pick) continue;
      if (g.category !== cat) {
        cat = g.category;
        lines.push(cat.toUpperCase());
      }
      lines.push(
        `• ${pick.skin.name} (${pick.equipped.wear}) — ${usd(pick.equipped.estPrice)}`,
        `  ${pick.equipped.steamUrl}`,
      );
    }
    lines.push(
      "",
      "Prices are Skinport median estimates — verify on Steam.",
      `Build yours: ${shareUrl}`,
    );
    return lines.join("\n");
  }, [equipped, picks, budget, budgetState.spent, shareUrl]);

  async function copy(kind: Copied, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      // Clipboard blocked (e.g. insecure context) — select-and-copy fallback.
      window.prompt("Copy:", value);
    }
  }

  const over = budgetState.remaining < -1e-9;
  const pct =
    budget > 0 ? Math.min(100, (budgetState.spent / budget) * 100) : 0;

  // Render equipped rows with a category header whenever the category changes.
  let lastCat = "";

  return (
    <div className="summary-overlay" onClick={onClose}>
      <div
        className="summary-panel"
        role="dialog"
        aria-label="Loadout summary"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="summary-head">
          <div>
            <span className="eyebrow">ForceBuy</span>
            <h2>Loadout</h2>
          </div>
          <button
            type="button"
            className="summary-close"
            onClick={onClose}
            aria-label="Close summary"
          >
            ✕
          </button>
        </header>

        <div className="summary-totals">
          <div className="hud-stat">
            <span className="k">Budget</span>
            <span className="v money">{usd(budget)}</span>
          </div>
          <div className="hud-stat">
            <span className="k">Spent</span>
            <span className="v spent money">{usd(budgetState.spent)}</span>
          </div>
          <div className="hud-stat">
            <span className="k">{over ? "Over by" : "Left"}</span>
            <span className="v remain money" data-neg={over}>
              {usd(Math.abs(budgetState.remaining))}
            </span>
          </div>
        </div>
        <div className="hud-track summary-track">
          <div
            className="hud-fill"
            data-over={over}
            style={{ width: `${over ? 100 : pct}%` }}
          />
        </div>

        <div className="summary-rows">
          {equipped.length === 0 ? (
            <div className="notice">
              Nothing equipped yet — pick a skin for a weapon to build a loadout.
            </div>
          ) : (
            equipped.map((g) => {
              const pick = picks[g.weapon]!;
              const showCat = g.category !== lastCat;
              lastCat = g.category;
              return (
                <div key={g.weapon}>
                  {showCat ? (
                    <div className="summary-cat eyebrow">{g.category}</div>
                  ) : null}
                  <a
                    className="summary-row"
                    href={pick.equipped.steamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open this wear on the Steam Community Market"
                  >
                    {pick.skin.image ? (
                      <img src={pick.skin.image} alt="" />
                    ) : (
                      <span className="summary-noimg" />
                    )}
                    <span className="summary-name">
                      <b>{pick.skin.weapon}</b>{" "}
                      {pick.skin.name.replace(`${pick.skin.weapon} | `, "")}
                    </span>
                    <span className="summary-wear">{pick.equipped.wear}</span>
                    <span className="summary-price money">
                      {usd(pick.equipped.estPrice)} ↗
                    </span>
                  </a>
                </div>
              );
            })
          )}
        </div>

        {unequipped > 0 ? (
          <div className="summary-note">
            {unequipped} armed weapon{unequipped > 1 ? "s" : ""} not equipped yet.
          </div>
        ) : null}

        <footer className="summary-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => copy("link", shareUrl)}
          >
            {copied === "link" ? "Link copied ✓" : "Copy link"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => copy("text", textSummary)}
          >
            {copied === "text" ? "Text copied ✓" : "Copy as text"}
          </button>
        </footer>
        <p className="summary-fine">
          Prices are recent Skinport-median estimates, not live quotes. Verify
          on Steam before buying.
        </p>
      </div>
    </div>
  );
}
