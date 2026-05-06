import { getTerritories } from "../api/hourglassApi.js";
import { isPointInMultiPolygon, isPointInPolygon } from "./geofence.js";

// Territories that must never receive new addresses. Either they are
// "parent" regions that have been split into smaller territories (so a
// hit here would shadow the real child territory) or they are bookkeeping
// buckets ("INCLUYER DIRECCIONES", "BORRAR DIRECCIONES").
const NON_ASSIGNABLE_TERRITORY_IDS = new Set([
  454498, // Región 2 — Sta Cecília e Campos Elíseos
  457897, // 000 - INCLUYER DIRECCIONES
  498363, // Región 3 — Sta Ifigênia y Luz
  643924, // Región 4 — República
  693042, // 000 - BORRAR DIRECCIONES
]);

function isAssignableTerritory(territory) {
  return !NON_ASSIGNABLE_TERRITORY_IDS.has(territory.id);
}

function getGeometryFromBoundaries(boundaries) {
  if (!boundaries || !boundaries.type) {
    return null;
  }

  if (boundaries.type === "Feature") {
    return boundaries.geometry || null;
  }

  return boundaries;
}

function isPointInsideGeometry(point, geometry) {
  if (!geometry || !geometry.type || !geometry.coordinates) {
    return false;
  }

  if (geometry.type === "MultiPolygon") {
    return isPointInMultiPolygon(point, geometry.coordinates);
  }

  if (geometry.type === "Polygon") {
    return isPointInPolygon(point, geometry.coordinates);
  }

  return false;
}

export function findTerritoryByLatLon(lat, lon, territories) {
  if (lat == null || lon == null) {
    throw new TypeError("lat and lon must be provided");
  }

  if (!Array.isArray(territories)) {
    throw new TypeError("territories must be an array");
  }

  const point = [lon, lat];

  for (const territory of territories) {
    if (!isAssignableTerritory(territory)) {
      continue;
    }

    let boundaries = territory.boundaries;
    if (!boundaries) {
      continue;
    }

    if (typeof boundaries === "string") {
      try {
        boundaries = JSON.parse(boundaries);
      } catch (error) {
        continue;
      }
    }

    const geometry = getGeometryFromBoundaries(boundaries);
    if (isPointInsideGeometry(point, geometry)) {
      return territory;
    }
  }

  return null;
}

export async function fetchTerritoryForLatLon(lat, lon, opts = {}) {
  const res = await getTerritories(opts);
  const territories = Array.isArray(res)
    ? res
    : res && Array.isArray(res.territories)
      ? res.territories
      : [];

  return findTerritoryByLatLon(lat, lon, territories);
}