import test from "node:test";
import assert from "node:assert/strict";

import {
  createAddress,
  getTerritories,
  getXsrfFromCookieString,
} from "../../../src/core/api/hourglassApi.js";

test("getTerritories calls correct endpoint and returns JSON", async () => {
  let called = false;
  global.fetch = async (url, opts) => {
    called = true;
    assert.strictEqual(url, "https://app.hourglass-app.com/api/v0.2/scheduling/territory");
    assert.strictEqual(opts.method, "GET");
    assert.strictEqual(opts.headers.Accept, "application/json");
    assert.strictEqual(opts.credentials, "include");
    return {
      ok: true,
      status: 200,
      json: async () => ({ territories: [{ id: 1 }] }),
      text: async () => JSON.stringify({ territories: [] }),
    };
  };
  const res = await getTerritories();
  assert.deepStrictEqual(res, { territories: [{ id: 1 }] });
  assert.ok(called);
});

test("getTerritories forwards an explicit xsrf token", async () => {
  global.fetch = async (_url, opts) => {
    assert.strictEqual(opts.headers["X-Hourglass-XSRF-Token"], "token123");
    return {
      ok: true,
      status: 200,
      json: async () => ({ territories: [] }),
      text: async () => "",
    };
  };

  const res = await getTerritories({ xsrfToken: "token123" });
  assert.deepStrictEqual(res, { territories: [] });
});

test("createAddress sends JSON body and xsrf header", async () => {
  const bodyObj = { id: 0, territoryId: 123 };
  global.fetch = async (url, opts) => {
    assert.strictEqual(url, "https://app.hourglass-app.com/api/v0.2/scheduling/territory/addresses");
    assert.strictEqual(opts.method, "PUT");
    assert.strictEqual(opts.headers["Content-Type"], "application/json");
    assert.strictEqual(opts.headers.Accept, "application/json");
    assert.strictEqual(opts.headers["X-Hourglass-XSRF-Token"], "token123");
    assert.strictEqual(opts.credentials, "include");
    assert.strictEqual(opts.body, JSON.stringify(bodyObj));
    return {
      ok: true,
      status: 201,
      json: async () => ({ success: true }),
      text: async () => "",
    };
  };
  const res = await createAddress(bodyObj, { xsrfToken: "token123" });
  assert.deepStrictEqual(res, { success: true });
});

test("createAddress reads xsrf from document.cookie when not provided", async () => {
  const bodyObj = { id: 0, territoryId: 456 };
  global.document = { cookie: "X-Hourglass-XSRF-Token=docToken" };
  global.fetch = async (url, opts) => {
    assert.strictEqual(opts.headers["X-Hourglass-XSRF-Token"], "docToken");
    assert.strictEqual(opts.body, JSON.stringify(bodyObj));
    return { ok: true, status: 200, json: async () => ({ success: true }), text: async () => "" };
  };
  const res = await createAddress(bodyObj);
  assert.deepStrictEqual(res, { success: true });
  delete global.document;
});

test("createAddress throws on non-ok response", async () => {
  global.fetch = async () => ({ ok: false, status: 400, text: async () => "Bad request" });
  await assert.rejects(async () => createAddress({ territoryId: 1 }), /400/);
});

test("getXsrfFromCookieString finds token", () => {
  const cookie = "foo=bar; X-Hourglass-XSRF-Token=abc%20123; another=one";
  const token = getXsrfFromCookieString(cookie);
  assert.strictEqual(token, "abc 123");
});