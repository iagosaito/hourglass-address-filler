import { getBackendConfig } from "../config/backendConfig.js";

const RESOLVE_PATH = "/v1/address/resolve";

export async function resolveAddressWithBackend(rawAddress) {
  if (typeof rawAddress !== "string" || rawAddress.trim() === "") {
    return null;
  }

  const { baseUrl, authToken } = await getBackendConfig();
  if (!baseUrl) {
    throw new Error("Backend URL is not configured.");
  }

  const response = await fetch(buildResolveUrl(baseUrl), {
    method: "POST",
    headers: buildHeaders(authToken),
    body: JSON.stringify({ rawAddress: rawAddress.trim() }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Backend request failed: ${response.status} ${errorText}`.trim());
  }

  const payload = await response.json();
  return normalizeResolvedAddresses(payload);
}

function buildResolveUrl(baseUrl) {
  const trimmed = String(baseUrl || "").trim().replace(/\/+$/, "");
  return `${trimmed}${RESOLVE_PATH}`;
}

function buildHeaders(authToken) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  return headers;
}

function normalizeResolvedAddresses(payload) {

  if (Array.isArray(payload)) {
    return payload
      .map((item) => normalizeResolvedAddress(item))
      .filter((item) => item !== null);
  }

  const normalized = normalizeResolvedAddress(payload);
  return normalized ? [normalized] : [];
}

const VALID_UF = new Set([
  "AC","AL","AP","AM","BA","CE","DF","ES","GO",
  "MA","MT","MS","MG","PA","PB","PR","PE","PI",
  "RJ","RN","RS","RO","RR","SC","SP","SE","TO",
]);

const STATE_TO_UF = {
  acre:"AC", alagoas:"AL", amapa:"AP", amazonas:"AM",
  bahia:"BA", ceara:"CE", distritofederal:"DF", espiritosanto:"ES",
  goias:"GO", maranhao:"MA", matogrosso:"MT", matogrossodosul:"MS",
  minasgerais:"MG", para:"PA", paraiba:"PB", parana:"PR",
  pernambuco:"PE", piaui:"PI", riodejaneiro:"RJ", riograndedonorte:"RN",
  riograndedosul:"RS", rondonia:"RO", roraima:"RR", santacatarina:"SC",
  saopaulo:"SP", sergipe:"SE", tocantins:"TO",
};

function normalizeStateToUF(state) {
  const upper = String(state || "").trim().toUpperCase();
  if (VALID_UF.has(upper)) return upper;

  const key = String(state || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "");

  return STATE_TO_UF[key] || upper;
}

function capitalizeWords(str) {
  return String(str || "")
    .trim()
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
}

function normalizeResolvedAddress(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  return {
    street: capitalizeWords(payload.street),
    number: String(payload.number || "").trim(),
    neighborhood: String(payload.neighborhood || "").trim(),
    city: String(payload.city || "").trim(),
    state: normalizeStateToUF(payload.state),
    cep: String(payload.cep || "").trim(),
    lat: Number(payload.lat),
    lon: Number(payload.lon),
  };
}