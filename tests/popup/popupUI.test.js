import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

import { setPopupDeps, setupPopup } from "../../src/popup/index.js";

test("popup flow: deny then accept candidate", async () => {
  const dom = new JSDOM(
    `<!doctype html><html><body>
      <div id="messageBox" class="message-box"></div>
      <textarea id="addressInput"></textarea>
      <button id="fillButton">Pré-visualizar</button>

      <div id="previewPanel" class="panel preview-panel">
        <div id="candidatePicker" class="candidate-picker">
          <div id="candidateList"></div>
        </div>
        <div id="previewSummary"></div>
        <pre id="previewJson"></pre>
        <button id="denyButton" class="secondary-button">Deny</button>
        <button id="approveButton">Approve & Submit</button>
      </div>

      <a id="openSettings" href="#">settings</a>
    </body></html>`,
    { url: "http://localhost" }
  );

  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;

  // Minimal chrome mocks used by popup
  global.chrome = {
    tabs: { query: async () => [{ id: 1 }] },
    scripting: { executeScript: async () => [{ result: "" }] },
    runtime: { openOptionsPage: () => {} },
    storage: { local: { get: async () => ({ backendBaseUrl: "http://backend", backendAuthToken: "t" }) } },
  };

  let createCalled = false;
  let lastPayload = null;

  const candidates = [
    { street: "Av. Paulista", number: "1578", city: "Sao Paulo", state: "SP", cep: "01310-200", lat: -23.56, lon: -46.64 },
    { street: "Avenida Paulista", number: "1578", city: "Sao Paulo", state: "SP", cep: "01310-200", lat: -23.57, lon: -46.63 },
  ];

  setPopupDeps({
    resolveAddressWithBackend: async () => candidates,
    getXsrfFromCookieString: () => "xsrf-123",
    fetchTerritoryForLatLon: async () => ({ id: "T1", number: "1" }),
    buildHourglassAddressPayload: () => ({ test: "payload" }),
    createAddress: async (payload) => {
      createCalled = true;
      lastPayload = payload;
      return {};
    },
  });

  // Initialize popup
  setupPopup();

  const addressInput = document.getElementById("addressInput");
  const fillButton = document.getElementById("fillButton");
  const candidateList = document.getElementById("candidateList");

  addressInput.value = "Av Paulista, 1578";

  // Trigger preview
  fillButton.dispatchEvent(new dom.window.Event("click"));

  // wait for candidateList to populate
  await waitFor(() => candidateList.children.length === 2, 2000);
  assert.equal(candidateList.children.length, 2);

  // Click Deny on first candidate
  const firstDeny = candidateList.querySelector(".candidate-row button.secondary-button");
  assert.ok(firstDeny, "Deny button should exist");
  firstDeny.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

  // wait for list to shrink
  await waitFor(() => candidateList.children.length === 1, 2000);
  assert.equal(candidateList.children.length, 1);

  // Click Accept on remaining candidate
  const acceptBtn = candidateList.querySelector(".candidate-row button.accept-button");
  assert.ok(acceptBtn, "Accept button should exist");
  acceptBtn.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

  // wait for createAddress to be called
  await waitFor(() => createCalled === true, 2000);
  assert.ok(createCalled, "createAddress should be called");
  assert.deepEqual(lastPayload, { test: "payload" });

  // cleanup
  delete global.window;
  delete global.document;
  delete global.chrome;
});

async function waitFor(fn, timeout = 1000) {
  const start = Date.now();
  while (true) {
    if (fn()) return;
    if (Date.now() - start > timeout) throw new Error("timeout waiting");
    await new Promise((r) => setTimeout(r, 10));
  }
}
