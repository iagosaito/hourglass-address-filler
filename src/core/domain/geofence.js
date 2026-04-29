function isPointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

export function isPointInPolygon(point, polygonCoordinates) {
  if (!Array.isArray(polygonCoordinates) || polygonCoordinates.length === 0) {
    return false;
  }

  const [outerRing, ...holes] = polygonCoordinates;
  if (!isPointInRing(point, outerRing)) {
    return false;
  }

  return !holes.some((hole) => isPointInRing(point, hole));
}

export function isPointInMultiPolygon(point, multiPolygonCoordinates) {
  if (
    !Array.isArray(multiPolygonCoordinates) ||
    multiPolygonCoordinates.length === 0
  ) {
    return false;
  }

  return multiPolygonCoordinates.some((polygon) =>
    isPointInPolygon(point, polygon)
  );
}