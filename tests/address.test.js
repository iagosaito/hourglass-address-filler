import assert from "node:assert/strict";
import test from "node:test";

import { parseGoogleMapsAddress } from "../src/shared/address.js";

test("parseGoogleMapsAddress parses a valid Google Maps style address", () => {
  const parsed = parseGoogleMapsAddress(
    "R. Dr. Vila Nova, 245 - Vila Buarque, São Paulo - SP, 01222-020"
  );

  assert.deepEqual(parsed, {
    street: "R. Dr. Vila Nova",
    number: "245",
    neighborhood: "Vila Buarque",
    city: "São Paulo",
    state: "SP",
    cep: "01222-020",
  });
});

test("parseGoogleMapsAddress returns null for invalid input", () => {
  const parsed = parseGoogleMapsAddress("invalid address");
  assert.equal(parsed, null);
});

test("parseGoogleMapsAddress normalizes whitespace and uppercases state", () => {
  const parsed = parseGoogleMapsAddress(
    "  Rua Exemplo, 10 - Centro, Curitiba - pr, 80000-000  "
  );

  assert.equal(parsed?.state, "PR");
  assert.equal(parsed?.city, "Curitiba");
});
