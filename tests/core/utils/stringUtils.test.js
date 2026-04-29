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
