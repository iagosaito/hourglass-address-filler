import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { findTerritoryByLatLon } from "../../../src/core/domain/territoryFinder.js";

test("centroid of each territory outer ring is inside that territory", () => {
  const json = fs.readFileSync(new URL("../../fixtures/get_territories_response.json", import.meta.url), "utf8");
  const territories = JSON.parse(json);
  assert.ok(Array.isArray(territories) && territories.length > 0, "no territories loaded");

  for (const t of territories) {
    const boundaries = typeof t.boundaries === "string" ? JSON.parse(t.boundaries) : t.boundaries;
    let outerRing;

    if (boundaries.type === "Polygon") {
      outerRing = boundaries.coordinates[0];
    } else if (boundaries.type === "MultiPolygon") {
      outerRing = boundaries.coordinates[0][0];
    } else if (boundaries.type === "Feature") {
      const geom = boundaries.geometry || {};
      if (geom.type === "Polygon") outerRing = geom.coordinates[0];
      else if (geom.type === "MultiPolygon") outerRing = geom.coordinates[0][0];
    }

    assert.ok(Array.isArray(outerRing) && outerRing.length > 0, `outer ring missing for territory ${t.id}`);

    let n = outerRing.length;
    if (n > 1) {
      const first = outerRing[0];
      const last = outerRing[n - 1];
      if (first[0] === last[0] && first[1] === last[1]) n -= 1;
    }

    let sumLon = 0;
    let sumLat = 0;
    for (let i = 0; i < n; i++) {
      const [lon, lat] = outerRing[i];
      sumLon += lon;
      sumLat += lat;
    }
    const centroidLat = sumLat / n;
    const centroidLon = sumLon / n;

    const found = findTerritoryByLatLon(centroidLat, centroidLon, territories);
    assert.ok(found, `territory not found for centroid of ${t.id}`);
    assert.strictEqual(found.id, t.id);
  }
});

test("point (0,0) is outside all territories", () => {
  const json = fs.readFileSync(new URL("../../fixtures/get_territories_response.json", import.meta.url), "utf8");
  const territories = JSON.parse(json);
  const found = findTerritoryByLatLon(0, 0, territories);
  assert.strictEqual(found, null);
});

test("throws error when coordinate is null", () => {
  const json = fs.readFileSync(new URL("../../fixtures/get_territories_response.json", import.meta.url), "utf8");
  const territories = JSON.parse(json);
  assert.throws(() => findTerritoryByLatLon(null, -46.6524186, territories), TypeError);
  assert.throws(() => findTerritoryByLatLon(-23.5541778, null, territories), TypeError);
  assert.throws(() => findTerritoryByLatLon(null, null, territories), TypeError);
});

test("throws error when territories is null", () => {
  assert.throws(() => findTerritoryByLatLon(-23.5541778, -46.6524186, null), TypeError);
  assert.throws(() => findTerritoryByLatLon(-23.5541778, -46.6524186, undefined), TypeError);
});