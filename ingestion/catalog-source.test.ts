import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCatalog, type RawSkin } from "./catalog-source.ts";

const fn = (name: string) => ({ name });
const oneWear = [{ name: "Factory New" }];

test("gun keeps its plain name and pattern", () => {
  const raw: RawSkin[] = [
    {
      weapon: fn("AK-47"),
      pattern: fn("Redline"),
      category: fn("Rifles"),
      wears: [{ name: "Field-Tested" }],
    },
  ];
  const out = normalizeCatalog(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, "AK-47 | Redline");
  assert.equal(out[0].pattern, "Redline");
});

test("painted knife gets a ★ prefix", () => {
  const raw: RawSkin[] = [
    {
      weapon: fn("Karambit"),
      pattern: fn("Doppler"),
      category: fn("Knives"),
      wears: oneWear,
    },
  ];
  const out = normalizeCatalog(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, "★ Karambit | Doppler");
});

test("vanilla knife (no pattern) is kept as ★ <weapon>", () => {
  const raw: RawSkin[] = [
    { weapon: fn("Karambit"), category: fn("Knives"), wears: oneWear },
  ];
  const out = normalizeCatalog(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, "★ Karambit");
  assert.equal(out[0].pattern, null);
});

test("gun without a pattern is dropped", () => {
  const raw: RawSkin[] = [
    { weapon: fn("AK-47"), category: fn("Rifles"), wears: oneWear },
  ];
  assert.equal(normalizeCatalog(raw).length, 0);
});

test("gloves are still excluded", () => {
  const raw: RawSkin[] = [
    {
      weapon: fn("Sport Gloves"),
      pattern: fn("Pandora's Box"),
      category: fn("Gloves"),
      wears: oneWear,
    },
  ];
  assert.equal(normalizeCatalog(raw).length, 0);
});

test("entries without wears are dropped", () => {
  const raw: RawSkin[] = [
    {
      weapon: fn("Karambit"),
      pattern: fn("Fade"),
      category: fn("Knives"),
      wears: [],
    },
  ];
  assert.equal(normalizeCatalog(raw).length, 0);
});

test("duplicate names collapse to one entry", () => {
  const dup: RawSkin = {
    weapon: fn("Karambit"),
    pattern: fn("Doppler"),
    category: fn("Knives"),
    wears: oneWear,
  };
  assert.equal(normalizeCatalog([dup, dup]).length, 1);
});
