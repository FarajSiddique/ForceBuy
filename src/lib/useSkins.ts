// Loads public/data/skins.json once and indexes it for the UI:
//   - skins grouped by weapon
//   - weapons grouped by category (in a stable, buy-menu-like order)
//   - the cheapest skin price per weapon (the floor used by the smart filter)

import { useEffect, useState } from "react";
import type { Skin, SkinsFile } from "../types/skin.ts";

/** Order categories the way a CS2 buy menu roughly reads, top to bottom. */
const CATEGORY_ORDER = ["Pistols", "SMGs", "Rifles", "Heavy", "Equipment"];

export interface WeaponGroup {
  weapon: string;
  category: string;
  skins: Skin[]; // sorted price-descending
  floor: number; // cheapest estPrice among these skins
}

export interface CategoryGroup {
  category: string;
  weapons: WeaponGroup[];
}

export interface SkinIndex {
  meta: SkinsFile["meta"];
  byWeapon: Map<string, WeaponGroup>;
  categories: CategoryGroup[];
}

export type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; index: SkinIndex };

function buildIndex(file: SkinsFile): SkinIndex {
  const byWeapon = new Map<string, WeaponGroup>();

  for (const skin of file.skins) {
    let group = byWeapon.get(skin.weapon);
    if (!group) {
      group = {
        weapon: skin.weapon,
        category: skin.category,
        skins: [],
        floor: Infinity,
      };
      byWeapon.set(skin.weapon, group);
    }
    group.skins.push(skin);
    if (skin.estPrice < group.floor) group.floor = skin.estPrice;
  }

  // Sort each weapon's skins by price, high → low (spec default).
  for (const group of byWeapon.values()) {
    group.skins.sort((a, b) => b.estPrice - a.estPrice);
  }

  // Group weapons under their category, categories in buy-menu order,
  // weapons alphabetically within a category.
  const catMap = new Map<string, WeaponGroup[]>();
  for (const group of byWeapon.values()) {
    const list = catMap.get(group.category) ?? [];
    list.push(group);
    catMap.set(group.category, list);
  }

  const categories: CategoryGroup[] = [...catMap.entries()]
    .sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a[0]);
      const bi = CATEGORY_ORDER.indexOf(b[0]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    })
    .map(([category, weapons]) => ({
      category,
      weapons: weapons.sort((a, b) => a.weapon.localeCompare(b.weapon)),
    }));

  return { meta: file.meta, byWeapon, categories };
}

export function useSkins(): LoadState {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/skins.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<SkinsFile>;
      })
      .then((file) => {
        if (!cancelled) setState({ status: "ready", index: buildIndex(file) });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Failed to load skins",
          });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
