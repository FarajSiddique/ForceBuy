import { memo, useCallback, useMemo, useState } from "react";
import type { Skin, WearPrice } from "../types/skin.ts";
import type { WeaponGroup } from "../lib/useSkins.ts";
import { withinHeadroom, type Pick } from "../lib/budget.ts";
import { usd, wearAbbr } from "../lib/format.ts";
import { SkinCard } from "./SkinCard.tsx";

interface Props {
  group: WeaponGroup;
  index: number;
  open: boolean;
  pick: Pick | null;
  headroom: number;
  onToggle: (weapon: string) => void;
  onEquip: (weapon: string, skin: Skin, wear: WearPrice) => void;
  onClear: (weapon: string) => void;
}

export const WeaponSlot = memo(function WeaponSlot({
  group,
  index,
  open,
  pick,
  headroom,
  onToggle,
  onEquip,
  onClear,
}: Props) {
  const [query, setQuery] = useState("");

  // Bind the weapon identity to stable per-slot handlers so SkinCard's
  // onEquip prop stays referentially stable across search keystrokes.
  const weapon = group.weapon;
  const handleToggle = useCallback(() => onToggle(weapon), [onToggle, weapon]);
  const handleClear = useCallback(() => onClear(weapon), [onClear, weapon]);
  const handleEquip = useCallback(
    (skin: Skin, wear: WearPrice) => onEquip(weapon, skin, wear),
    [onEquip, weapon],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return group.skins;
    return group.skins.filter((s) => s.name.toLowerCase().includes(q));
  }, [group.skins, query]);

  // Float everything within headroom to the top (each half stays price-desc)
  // so the affordable picks are visible without scrolling past pricey ones.
  const { within, over } = useMemo(() => {
    const within: typeof filtered = [];
    const over: typeof filtered = [];
    for (const s of filtered) {
      (withinHeadroom(s.estPrice, headroom) ? within : over).push(s);
    }
    return { within, over };
  }, [filtered, headroom]);

  const inBudgetCount = useMemo(
    () => group.skins.filter((s) => withinHeadroom(s.estPrice, headroom)).length,
    [group.skins, headroom],
  );

  return (
    <section className="slot" data-open={open} data-picked={pick != null}>
      <button
        type="button"
        className="slot-head"
        onClick={handleToggle}
        aria-expanded={open}
      >
        <span className="slot-index">{String(index + 1).padStart(2, "0")}</span>
        <span className="slot-weapon">{group.weapon}</span>

        {pick ? (
          <span className="slot-status">
            <span className="slot-pick">
              {pick.skin.image ? <img src={pick.skin.image} alt="" /> : null}
              <span className="pname">
                {pick.skin.name.replace(`${pick.skin.weapon} | `, "")}
              </span>
              <span
                className="wear-badge"
                title={`Equipped wear: ${pick.equipped.wear}`}
              >
                {wearAbbr(pick.equipped.wear)}
              </span>
              <span className="pprice money">{usd(pick.equipped.estPrice)}</span>
            </span>

            <a
              className="slot-market"
              href={pick.equipped.steamUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Open this exact wear on the Steam Community Market"
            >
              Marketplace ↗
            </a>
            <span
              className="slot-change"
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  handleClear();
                }
              }}
            >
              Change
            </span>
          </span>
        ) : (
          <span className="slot-status">
            <span className="slot-headroom">
              up to <b>{usd(Math.max(0, headroom))}</b>
            </span>
            <span className="slot-chevron">▶</span>
          </span>
        )}
      </button>

      {open && !pick ? (
        <div className="slot-body">
          <div className="slot-tools">
            <label className="search">
              <span className="ico">⌕</span>
              <input
                type="text"
                placeholder={`Search ${group.weapon} skins…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <span className="slot-count">
              {inBudgetCount} / {group.skins.length} in budget
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="notice">No skins match “{query}”.</div>
          ) : (
            <div className="skin-grid">
              {within.map((skin) => (
                <SkinCard
                  key={skin.id}
                  skin={skin}
                  headroom={headroom}
                  onEquip={handleEquip}
                />
              ))}
              {within.length > 0 && over.length > 0 ? (
                <div className="grid-divider">
                  <span>over budget · {over.length}</span>
                </div>
              ) : null}
              {over.map((skin) => (
                <SkinCard
                  key={skin.id}
                  skin={skin}
                  headroom={headroom}
                  onEquip={handleEquip}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
});
