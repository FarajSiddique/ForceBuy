/** Money formatting used across the HUD. USD, no cents on whole dollars. */
export function usd(n: number): string {
  const abs = Math.abs(n);
  const s = abs.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(abs) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? "-" : ""}$${s}`;
}

// Canonical two-letter wear codes — also used as the compact token in share URLs.
const WEAR_ABBR: Record<string, string> = {
  "Factory New": "FN",
  "Minimal Wear": "MW",
  "Field-Tested": "FT",
  "Well-Worn": "WW",
  "Battle-Scarred": "BS",
};
const ABBR_WEAR: Record<string, string> = Object.fromEntries(
  Object.entries(WEAR_ABBR).map(([wear, abbr]) => [abbr, wear]),
);

/** Short wear label, e.g. "Field-Tested" → "FT", "Factory New" → "FN". */
export function wearAbbr(wear: string): string {
  return (
    WEAR_ABBR[wear] ??
    wear
      .split(/[-\s]+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
  );
}

/** Reverse of wearAbbr: "FT" → "Field-Tested". Null if unknown. */
export function abbrToWear(abbr: string): string | null {
  return ABBR_WEAR[abbr] ?? null;
}
