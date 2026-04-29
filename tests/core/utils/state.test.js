import assert from "node:assert/strict";
import test from "node:test";

import { normalizeStateToUF } from "../../../src/core/utils/state.js";

test("normalizeStateToUF: valid UF code is returned uppercased", () => {
  assert.equal(normalizeStateToUF("sp"), "SP");
  assert.equal(normalizeStateToUF("MG"), "MG");
});

test("normalizeStateToUF: full name with accent (São Paulo) → SP", () => {
  assert.equal(normalizeStateToUF("São Paulo"), "SP");
});

test("normalizeStateToUF: full name without accent (Sao Paulo) → SP", () => {
  assert.equal(normalizeStateToUF("Sao Paulo"), "SP");
});

test("normalizeStateToUF: full name without space (SaoPaulo) → SP", () => {
  assert.equal(normalizeStateToUF("SaoPaulo"), "SP");
});

test("normalizeStateToUF: Minas Gerais → MG", () => {
  assert.equal(normalizeStateToUF("Minas Gerais"), "MG");
});

test("normalizeStateToUF: Rio de Janeiro → RJ", () => {
  assert.equal(normalizeStateToUF("Rio de Janeiro"), "RJ");
});

test("normalizeStateToUF: Rio Grande do Sul → RS", () => {
  assert.equal(normalizeStateToUF("Rio Grande do Sul"), "RS");
});

test("normalizeStateToUF: unknown value is returned uppercased as fallback", () => {
  assert.equal(normalizeStateToUF("Somewhere"), "SOMEWHERE");
});

test("normalizeStateToUF: null/undefined returns empty string fallback", () => {
  assert.equal(normalizeStateToUF(null), "");
  assert.equal(normalizeStateToUF(undefined), "");
});

// Kills trim() removal — whitespace around a valid UF code must be stripped
test("normalizeStateToUF: UF code with surrounding whitespace is normalized", () => {
  assert.equal(normalizeStateToUF("  SP  "), "SP");
});

// All remaining states by full name — kills individual STATE_TO_UF value mutations
test("normalizeStateToUF: all states resolve correctly by full name", () => {
  const cases = [
    ["Acre", "AC"],
    ["Alagoas", "AL"],
    ["Amapá", "AP"],
    ["Amazonas", "AM"],
    ["Bahia", "BA"],
    ["Ceará", "CE"],
    ["Distrito Federal", "DF"],
    ["Espírito Santo", "ES"],
    ["Goiás", "GO"],
    ["Maranhão", "MA"],
    ["Mato Grosso", "MT"],
    ["Mato Grosso do Sul", "MS"],
    ["Pará", "PA"],
    ["Paraíba", "PB"],
    ["Paraná", "PR"],
    ["Pernambuco", "PE"],
    ["Piauí", "PI"],
    ["Rio Grande do Norte", "RN"],
    ["Rondônia", "RO"],
    ["Roraima", "RR"],
    ["Santa Catarina", "SC"],
    ["Sergipe", "SE"],
    ["Tocantins", "TO"],
  ];

  for (const [name, expected] of cases) {
    assert.equal(normalizeStateToUF(name), expected, `Expected ${name} → ${expected}`);
  }
});
