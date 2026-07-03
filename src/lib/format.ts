/** Money formatting used across the HUD. USD, no cents on whole dollars. */
export function usd(n: number): string {
  const abs = Math.abs(n);
  const s = abs.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(abs) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? "-" : ""}$${s}`;
}

/** Short wear label, e.g. "Field-Tested" → "FT". */
export function wearAbbr(wear: string): string {
  return wear
    .split("-")
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
