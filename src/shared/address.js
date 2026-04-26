const ADDRESS_REGEX =
  /(.+?),\s*(\d+[\w-]*)\s*-\s*(.+?),\s*(.+?)\s*-\s*([A-Za-z]{2}),\s*(\d{5}-\d{3})/;

export function parseGoogleMapsAddress(rawAddress) {
  if (typeof rawAddress !== "string") {
    return null;
  }

  const match = rawAddress.trim().match(ADDRESS_REGEX);
  if (!match) {
    return null;
  }

  return {
    street: match[1].trim(),
    number: match[2].trim(),
    neighborhood: match[3].trim(),
    city: match[4].trim(),
    state: match[5].trim().toUpperCase(),
    cep: match[6].trim(),
  };
}
