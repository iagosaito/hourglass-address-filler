import assert from "node:assert/strict";
import test from "node:test";

import { isPointInMultiPolygon } from "../src/shared/geofence.js";

const multiPolygon = {
  type: "MultiPolygon",
  coordinates: [
    [
      [
        [-46.663227, -23.537393],
        [-46.661682, -23.539163],
        [-46.659811, -23.540164],
        [-46.658388, -23.535612],
        [-46.656889, -23.533319],
        [-46.659107, -23.53212],
        [-46.660995, -23.531884],
        [-46.663227, -23.537393],
      ],
    ],
  ],
};

test("isPointInMultiPolygon returns true for point inside", () => {
  const point = [-46.6602, -23.5354];
  const isInside = isPointInMultiPolygon(point, multiPolygon.coordinates);

  assert.equal(isInside, true);
});

test("isPointInMultiPolygon returns false for point outside", () => {
  const point = [-46.7001, -23.5602];
  const isInside = isPointInMultiPolygon(point, multiPolygon.coordinates);

  assert.equal(isInside, false);
});
