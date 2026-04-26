function buildNominatimUrl({ street, number, neighborhood, city, state }) {
  const parts = [street, number, neighborhood, city, state].filter(Boolean);
  const fullAddress = parts.join(", ");
  const encodedAddress = encodeURIComponent(fullAddress);
  return `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json`;
}

export async function getLatLonFromAddress(addressFields) {
  const url = buildNominatimUrl(addressFields);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "hourglass-auto-fill-extension",
        "Accept-Language": "pt-BR",
      },
    });

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("No geocoding results found");
    }

    const { lat, lon } = data[0];
    return { lat: Number(lat), lon: Number(lon) };
  } catch (error) {
    console.error("[Geocoding Error]", error);
    return null;
  }
}
