// Stateless loadout sharing: encode budget + picks into a URL query string and
// decode it back against the skin index. No backend — the URL *is* the state.
//
// Wire format:  ?b=<budget>&p=<id>_<wearAbbr>.<id>_<wearAbbr>...
// e.g.          ?b=50&p=ak-47-redline_FT.usp-s-cortex_MW
// Tokens use only url-safe characters ("." "_" "-" and alphanumerics), so the
// query never needs percent-encoding.

import type { Skin, WearPrice } from "../types/skin.ts";
import type { Picks } from "./budget.ts";
import { wearAbbr, abbrToWear } from "./format.ts";

export function encodeLoadout(budget: number, picks: Picks): string {
  const tokens: string[] = [];
  for (const weapon of Object.keys(picks)) {
    const pick = picks[weapon];
    if (pick) tokens.push(`${pick.skin.id}_${wearAbbr(pick.equipped.wear)}`);
  }

  const params = new URLSearchParams();
  if (budget > 0) params.set("b", String(budget));
  if (tokens.length) params.set("p", tokens.join("."));
  return params.toString();
}

export interface DecodedLoadout {
  budget: number;
  picks: Picks;
}

/** Parse a loadout from a query string. Returns null if there's nothing to load. */
export function decodeLoadout(
  search: string,
  byId: Map<string, Skin>,
): DecodedLoadout | null {
  const params = new URLSearchParams(search);
  const b = Number(params.get("b"));
  const p = params.get("p");
  if (!(b > 0) && !p) return null;

  const picks: Picks = {};
  if (p) {
    for (const token of p.split(".")) {
      const sep = token.lastIndexOf("_");
      if (sep === -1) continue;
      const id = token.slice(0, sep);
      const abbr = token.slice(sep + 1);
      const skin = byId.get(id);
      if (!skin) continue;

      const wearName = abbrToWear(abbr) ?? skin.estPriceWear;
      const equipped: WearPrice =
        skin.wears.find((w) => w.wear === wearName) ?? {
          wear: skin.estPriceWear,
          estPrice: skin.estPrice,
          steamUrl: skin.steamUrl,
        };
      picks[skin.weapon] = { skin, equipped };
    }
  }

  return { budget: b > 0 ? b : 0, picks };
}
