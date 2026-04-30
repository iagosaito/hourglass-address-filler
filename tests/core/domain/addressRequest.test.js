import assert from "node:assert/strict";
import test from "node:test";

import { buildHourglassAddressPayload } from "../../../src/core/domain/addressRequest.js";

test("buildHourglassAddressPayload appends apt to line1 when provided", () => {
  const payload = buildHourglassAddressPayload(
    {
      street: "Av Angelica",
      number: "919",
      apt: "12",
      neighborhood: "Santa Cecília",
      city: "São Paulo",
      state: "SP",
      cep: "01227-000",
    },
    { lat: -23.54, lon: -46.65 },
    { id: 1 }
  );

  assert.equal(payload.line1, "Av Angelica, 919 - 12");
});

test("buildHourglassAddressPayload omits apt separator when apt is empty", () => {
  const payload = buildHourglassAddressPayload(
    {
      street: "Av Angelica",
      number: "919",
      apt: "",
      neighborhood: "",
      city: "",
      state: "SP",
      cep: "",
    },
    { lat: -23.54, lon: -46.65 },
    { id: 1 }
  );

  assert.equal(payload.line1, "Av Angelica, 919");
});

test("buildHourglassAddressPayload creates the Hourglass payload shape", () => {
  const payload = buildHourglassAddressPayload(
    {
      street: "R. Frei Caneca",
      number: "569",
      neighborhood: "Consolação",
      city: "São Paulo",
      state: "sp",
      cep: "01307-001",
    },
    {
      lat: -23.5541778,
      lon: -46.6524186,
    },
    {
      id: 497188,
    }
  );

  assert.deepEqual(payload, {
    id: 0,
    territoryId: 497188,
    sortOrder: 9999,
    line1: "R. Frei Caneca, 569",
    dnc: false,
    hideOnMap: false,
    tags: [],
    line2: "Consolação",
    city: "São Paulo",
    postalcode: "01307-001",
    location: {
      x: -46.6524186,
      y: -23.5541778,
    },
    state: "SP",
  });
});