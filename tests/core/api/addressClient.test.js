import assert from "node:assert/strict";
import test from "node:test";

import { resolveAddressWithBackend } from "../../../src/core/api/addressClient.js";

global.chrome = {
  storage: {
    local: {
      get: async () => ({
        backendBaseUrl: "http://backend.local:8080",
        backendAuthToken: "token-123",
      }),
    },
  },
};

test("resolveAddressWithBackend posts the raw address to the backend and returns candidates", async () => {
  let requestUrl;
  let requestBody;
  let requestHeaders;

  global.fetch = async (url, options) => {
    requestUrl = url;
    requestBody = options.body;
    requestHeaders = options.headers;

    return {
      ok: true,
      json: async () => ([
        {
          street: "Av. Paulista",
          number: "1578",
          neighborhood: "Bela Vista",
          city: "São Paulo",
          state: "sp",
          cep: "01310-200",
          lat: -23.56,
          lon: -46.64,
        },
        {
          street: "Avenida Paulista",
          number: "1578",
          neighborhood: "Bela Vista",
          city: "São Paulo",
          state: "sp",
          cep: "01310-200",
          lat: -23.57,
          lon: -46.63,
        },
      ]),
    };
  };

  const parsed = await resolveAddressWithBackend("Av Paulista, 1578");

  assert.equal(requestUrl, "http://backend.local:8080/v1/address/resolve");
  assert.deepEqual(JSON.parse(requestBody), { rawAddress: "Av Paulista, 1578" });
  assert.equal(requestHeaders.Authorization, "Bearer token-123");
  assert.deepEqual(parsed, [
    {
      street: "Av. Paulista",
      number: "1578",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
      cep: "01310-200",
      lat: -23.56,
      lon: -46.64,
    },
    {
      street: "Avenida Paulista",
      number: "1578",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
      cep: "01310-200",
      lat: -23.57,
      lon: -46.63,
    },
  ]);

  delete global.fetch;
});

test("resolveAddressWithBackend returns null for empty input", async () => {
  const result = await resolveAddressWithBackend("   ");
  assert.equal(result, null);
});

// --- normalizeStateToUF (tested through resolveAddressWithBackend) ---

async function resolveWithState(state) {
  global.fetch = async () => ({
    ok: true,
    json: async () => ([{ street: "", number: "", neighborhood: "", city: "", state, cep: "", lat: 0, lon: 0 }]),
  });
  const [result] = await resolveAddressWithBackend("any");
  delete global.fetch;
  return result.state;
}

test("normalizeStateToUF: lowercase UF code is uppercased", async () => {
  assert.equal(await resolveWithState("sp"), "SP");
});

test("normalizeStateToUF: full name with accent (São Paulo) → SP", async () => {
  assert.equal(await resolveWithState("São Paulo"), "SP");
});

test("normalizeStateToUF: full name without accent (Sao Paulo) → SP", async () => {
  assert.equal(await resolveWithState("Sao Paulo"), "SP");
});

test("normalizeStateToUF: full name without space (SaoPaulo) → SP", async () => {
  assert.equal(await resolveWithState("SaoPaulo"), "SP");
});

test("normalizeStateToUF: Minas Gerais → MG", async () => {
  assert.equal(await resolveWithState("Minas Gerais"), "MG");
});

test("normalizeStateToUF: Rio de Janeiro → RJ", async () => {
  assert.equal(await resolveWithState("Rio de Janeiro"), "RJ");
});

test("normalizeStateToUF: Rio Grande do Sul → RS", async () => {
  assert.equal(await resolveWithState("Rio Grande do Sul"), "RS");
});

test("normalizeStateToUF: unknown value is returned uppercased as fallback", async () => {
  assert.equal(await resolveWithState("Somewhere"), "SOMEWHERE");
});

test("resolveAddressWithBackend applies capitalizeWords to street", async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ([{ street: "av. paulista", number: "", neighborhood: "", city: "", state: "SP", cep: "", lat: 0, lon: 0 }]),
  });
  const [result] = await resolveAddressWithBackend("any");
  delete global.fetch;
  assert.equal(result.street, "Av. Paulista");
});