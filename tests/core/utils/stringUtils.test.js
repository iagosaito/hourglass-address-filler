import assert from "node:assert/strict";
import test from "node:test";

import { capitalizeWords } from "../../../src/core/utils/stringUtils.js";

test("capitalizeWords: lowercases and capitalizes each word", () => {
  assert.equal(capitalizeWords("av. paulista"), "Av. Paulista");
});

test("capitalizeWords: uppercased input is title-cased", () => {
  assert.equal(capitalizeWords("RUA DOIS DE MARÇO"), "Rua Dois De Março");
});

test("capitalizeWords: already title-cased input is unchanged", () => {
  assert.equal(capitalizeWords("Avenida Paulista"), "Avenida Paulista");
});

test("capitalizeWords: single word is capitalized", () => {
  assert.equal(capitalizeWords("alameda"), "Alameda");
});

test("capitalizeWords: empty string returns empty string", () => {
  assert.equal(capitalizeWords(""), "");
});

test("capitalizeWords: null/undefined returns empty string", () => {
  assert.equal(capitalizeWords(null), "");
  assert.equal(capitalizeWords(undefined), "");
});

// Mutation tests — each assertion kills one specific code mutation.

// Kills: removing .trim() — without it, leading space would produce " Rua Das Flores"
test("capitalizeWords [mut: trim removed]: strips leading and trailing whitespace", () => {
  assert.equal(capitalizeWords("  rua das flores  "), "Rua Das Flores");
});

// Kills: removing .toLowerCase() — without it, "UA" in "RUA" would stay uppercase → "RUA"
test("capitalizeWords [mut: toLowerCase removed]: non-first chars of each word are lowercase", () => {
  const result = capitalizeWords("RUA AUGUSTA");
  assert.equal(result[1], "u"); // 'R' is index 0, 'u' must be index 1
  assert.equal(result[2], "a");
});

// Kills: c.toUpperCase() → c.toLowerCase() — first char of each word would stay lowercase
test("capitalizeWords [mut: toUpperCase→toLowerCase]: first char of each word is uppercase", () => {
  const result = capitalizeWords("rua das flores");
  assert.equal(result[0], "R");
  assert.equal(result[4], "D");
  assert.equal(result[8], "F");
});

// Kills: regex /(?:^|\s)\S/ → /\S/ — every char would be uppercased → "AV. PAULISTA"
test("capitalizeWords [mut: regex boundary removed]: only the first char of each word is uppercased", () => {
  const result = capitalizeWords("av. paulista");
  assert.equal(result, "Av. Paulista");
  assert.equal(result[1], "v"); // second char must remain lowercase
  assert.equal(result[5], "a"); // second char of 'paulista' must remain lowercase
});
