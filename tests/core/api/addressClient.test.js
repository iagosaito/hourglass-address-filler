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

test("resolveAddressWithBackend applies normalizeStateToUF to state", async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ([{ street: "", number: "", neighborhood: "", city: "", state: "São Paulo", cep: "", lat: 0, lon: 0 }]),
  });
  const [result] = await resolveAddressWithBackend("any");
  delete global.fetch;
  assert.equal(result.state, "SP");
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