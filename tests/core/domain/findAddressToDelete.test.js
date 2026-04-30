import test from "node:test";
import assert from "node:assert/strict";

import { findAddressToDelete } from "../../../src/core/domain/findAddressToDelete.js";

function makeStubSearch(responsesByQuery) {
  const calls = [];
  const fn = async (query, opts) => {
    calls.push({ query, opts });
    return responsesByQuery[query] ?? [];
  };
  fn.calls = calls;
  return fn;
}

test("findAddressToDelete returns 'one' when first variant returns single match", async () => {
  const match = { id: 1, line1: "Rua Marconi 131" };
  const searchAddresses = makeStubSearch({ "Marconi 131": [match] });
  const result = await findAddressToDelete(
    { street: "Rua Marconi", number: "131" },
    { searchAddresses, xsrfToken: "tok" },
  );
  assert.strictEqual(result.status, "one");
  assert.deepStrictEqual(result.matches, [match]);
  assert.strictEqual(result.query, "Marconi 131");
  assert.strictEqual(searchAddresses.calls.length, 1);
});

test("findAddressToDelete returns 'many' with all matches", async () => {
  const matches = [{ id: 1 }, { id: 2 }];
  const searchAddresses = makeStubSearch({ "Marconi 131": matches });
  const result = await findAddressToDelete(
    { street: "Rua Marconi", number: "131" },
    { searchAddresses, xsrfToken: "tok" },
  );
  assert.strictEqual(result.status, "many");
  assert.deepStrictEqual(result.matches, matches);
});

test("findAddressToDelete falls back to next variant when first returns empty", async () => {
  const match = { id: 9 };
  const searchAddresses = makeStubSearch({
    "Cândico Záfira 398": [],
    "Candico Zafira 398": [match],
  });
  const result = await findAddressToDelete(
    { street: "Rua Cândico Záfira", number: "398" },
    { searchAddresses, xsrfToken: "tok" },
  );
  assert.strictEqual(result.status, "one");
  assert.deepStrictEqual(result.matches, [match]);
  assert.strictEqual(result.query, "Candico Zafira 398");
  assert.strictEqual(searchAddresses.calls.length, 2);
});

test("findAddressToDelete returns 'none' after exhausting all variants", async () => {
  const searchAddresses = makeStubSearch({});
  const result = await findAddressToDelete(
    { street: "Rua Cândico Záfira", number: "398" },
    { searchAddresses, xsrfToken: "tok" },
  );
  assert.strictEqual(result.status, "none");
  assert.deepStrictEqual(result.matches, []);
  assert.deepStrictEqual(result.triedQueries, [
    "Cândico Záfira 398",
    "Candico Zafira 398",
    "Záfira, 398",
    "Zafira, 398",
  ]);
  assert.strictEqual(searchAddresses.calls.length, 4);
});

test("findAddressToDelete forwards xsrfToken to searchAddresses", async () => {
  const searchAddresses = makeStubSearch({ "Marconi 131": [{ id: 1 }] });
  await findAddressToDelete(
    { street: "Rua Marconi", number: "131" },
    { searchAddresses, xsrfToken: "tokABC" },
  );
  assert.strictEqual(searchAddresses.calls[0].opts.xsrfToken, "tokABC");
});

test("findAddressToDelete throws when candidate is null", async () => {
  await assert.rejects(
    async () => findAddressToDelete(null, { searchAddresses: async () => [] }),
    /candidate must be an object/,
  );
});

test("findAddressToDelete throws when searchAddresses is missing", async () => {
  await assert.rejects(
    async () => findAddressToDelete({ street: "x", number: "1" }, {}),
    /deps\.searchAddresses must be a function/,
  );
});
