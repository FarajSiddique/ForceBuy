import { useState } from "react";
import type { Skin, WearPrice } from "../types/skin.ts";
import { withinHeadroom } from "../lib/budget.ts";
import { usd, wearAbbr } from "../lib/format.ts";

// Rough rarity → accent color for the thin bar under each skin image.
// Mirrors CS2's rarity gradient loosely; falls back to grey.
const RARITY_COLOR: Record<string, string> = {
  "Consumer Grade": "#b0c3d9",
  "Industrial Grade": "#5e98d9",
  "Mil-Spec Grade": "#4b69ff",
  Restricted: "#8847ff",
  Classified: "#d32ce6",
  Covert: "#eb4b4b",
  Contraband: "#e4ae39",
};

interface Props {
  skin: Skin;
  /** Advisory spend headroom for this slot — drives red/lime coloring only. */
  headroom: number;
  /** Equip this skin at a specific wear (defaults to the cheapest on the card). */
  onEquip: (skin: Skin, wear: WearPrice) => void;
}

/** The headline wear as a WearPrice (cheapest — same data the card leads with). */
function headlineWear(skin: Skin): WearPrice {
  return (
    skin.wears.find((w) => w.wear === skin.estPriceWear) ?? {
      wear: skin.estPriceWear,
      estPrice: skin.estPrice,
      steamUrl: skin.steamUrl,
    }
  );
}

export function SkinCard({ skin, headroom, onEquip }: Props) {
  const [open, setOpen] = useState(false);
  const rarityColor = (skin.rarity && RARITY_COLOR[skin.rarity]) || "#59615a";
  const hasLadder = skin.wears.length > 1;
  const over = !withinHeadroom(skin.estPrice, headroom);

  return (
    <div className="card" data-over={over}>
      <div className="card-img">
        {skin.image ? (
          <img src={skin.image} alt={skin.name} loading="lazy" decoding="async" />
        ) : null}
        <span className="rarity-bar" style={{ background: rarityColor }} />
      </div>

      <div className="card-body">
        <div className="card-name">
          <span className="wpn">{skin.weapon}</span>
          {skin.name.replace(`${skin.weapon} | `, "")}
        </div>

        <div className="card-priceline">
          <span className="card-price">{usd(skin.estPrice)}</span>
          {over ? <span className="over-tag">Over</span> : null}
          <span className="wear-badge" title={`Cheapest wear: ${skin.estPriceWear}`}>
            {wearAbbr(skin.estPriceWear)}
          </span>
        </div>

        <div className="card-actions">
          <button
            type="button"
            className="btn-pick"
            onClick={() => onEquip(skin, headlineWear(skin))}
          >
            Equip
          </button>
          {hasLadder ? (
            <button
              type="button"
              className="btn-ghost"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
              title="Pick a specific wear to equip"
            >
              {open ? "Hide" : "Wears"}
            </button>
          ) : null}
        </div>

        {open && hasLadder ? (
          <div className="ladder">
            {skin.wears.map((w) => {
              const wearOver = !withinHeadroom(w.estPrice, headroom);
              return (
                <button
                  key={w.wear}
                  type="button"
                  className={`ladder-row${w.wear === skin.estPriceWear ? " is-head" : ""}`}
                  data-over={wearOver}
                  onClick={() => onEquip(skin, w)}
                  title={`Equip ${skin.name} (${w.wear})`}
                >
                  <span className="lw">{w.wear}</span>
                  <span className="lp">{usd(w.estPrice)}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
