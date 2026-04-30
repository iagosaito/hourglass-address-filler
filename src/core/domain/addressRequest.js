function formatLine1(street, number, apt) {
  const streetPart = String(street || "").trim();
  const numberPart = String(number || "").trim();
  const aptPart = String(apt || "").trim();

  if (!streetPart || !numberPart) {
    throw new TypeError(
      `street and number must be provided as non-empty strings; received street=${JSON.stringify(street)} number=${JSON.stringify(number)}`
    );
  }

  const base = `${streetPart}, ${numberPart}`;
  return aptPart ? `${base} - ${aptPart}` : base;
}

function assertFiniteCoordinate(value, label) {
  if (!Number.isFinite(value)) {
    throw new TypeError(
      `${label} must be a finite number; received ${JSON.stringify(value)}`
    );
  }
}

export function buildHourglassAddressPayload(parsedFields, locationDetails, territory) {
  if (!parsedFields || typeof parsedFields !== "object") {
    throw new TypeError(
      `parsedFields must be an object with street, number, neighborhood, city, state, and cep; received ${JSON.stringify(parsedFields)}`
    );
  }

  if (!locationDetails || typeof locationDetails !== "object") {
    throw new TypeError(
      `locationDetails must be an object with lat and lon; received ${JSON.stringify(locationDetails)}`
    );
  }

  if (!territory || typeof territory !== "object") {
    throw new TypeError(
      `territory must be an object with an id; received ${JSON.stringify(territory)}`
    );
  }

  const line1 = formatLine1(parsedFields.street, parsedFields.number, parsedFields.apt);
  assertFiniteCoordinate(locationDetails.lon, "locationDetails.lon");
  assertFiniteCoordinate(locationDetails.lat, "locationDetails.lat");

  if (territory.id == null) {
    throw new TypeError(
      `territory.id must be provided; received ${JSON.stringify(territory.id)}`
    );
  }

  return {
    id: 0,
    territoryId: territory.id,
    sortOrder: 9999,
    line1,
    dnc: false,
    hideOnMap: false,
    tags: [],
    line2: String(parsedFields.neighborhood || "").trim(),
    city: String(parsedFields.city || "").trim(),
    postalcode: String(parsedFields.cep || "").trim(),
    location: {
      x: locationDetails.lon,
      y: locationDetails.lat,
    },
    state: String(parsedFields.state || "").trim().toUpperCase(),
  };
}