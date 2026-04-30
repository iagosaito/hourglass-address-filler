import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSearchVariants,
  removeAccents,
} from "../../../src/core/domain/addressSearchQuery.js";

test("buildSearchVariants drops Rua prefix and produces 4 variants for accented multi-word street", () => {
  const variants = buildSearchVariants("Rua Cândico Záfira", "398");
  assert.deepStrictEqual(variants, [
    "Cândico Záfira 398",
    "Candico Zafira 398",
    "Záfira, 398",
    "Zafira, 398",
  ]);
});

test("buildSearchVariants drops R. prefix", () => {
  const variants = buildSearchVariants("R. Aureliano Coutinho", "258");
  assert.ok(variants[0].startsWith("Aureliano"), `expected first variant to start with Aureliano, got: ${variants[0]}`);
});

test("buildSearchVariants drops Av. prefix", () => {
  const variants = buildSearchVariants("Av. Angelica", "919");
  assert.strictEqual(variants[0], "Angelica 919");
});

test("buildSearchVariants dedupes when no accents are present", () => {
  const variants = buildSearchVariants("Rua Marconi", "131");
  // "Marconi 131" appears once (with-accent and without-accent collapse).
  // "Marconi, 131" appears once (last-word with comma).
  assert.deepStrictEqual(variants, ["Marconi 131", "Marconi, 131"]);
});

test("buildSearchVariants for single-word street produces 2 unique variants", () => {
  const variants = buildSearchVariants("Marconi", "131");
  assert.deepStrictEqual(variants, ["Marconi 131", "Marconi, 131"]);
});

test("buildSearchVariants throws on empty street", () => {
  assert.throws(() => buildSearchVariants("", "131"), /street must be a non-empty string/);
});

test("buildSearchVariants throws on empty number", () => {
  assert.throws(() => buildSearchVariants("Rua Marconi", ""), /number must be a non-empty string/);
});

test("removeAccents strips Portuguese accents", () => {
  assert.strictEqual(removeAccents("São Paulo"), "Sao Paulo");
  assert.strictEqual(removeAccents("Cândico Záfira"), "Candico Zafira");
  assert.strictEqual(removeAccents("São Caetano do Sul"), "Sao Caetano do Sul");
});
