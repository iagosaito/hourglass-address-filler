const BACKEND_BASE_URL_KEY = "backendBaseUrl";
const BACKEND_AUTH_TOKEN_KEY = "backendAuthToken";
const DEFAULT_BACKEND_BASE_URL = "http://localhost:8080";

export async function getBackendConfig() {
  try {
    const result = await chrome.storage.local.get([
      BACKEND_BASE_URL_KEY,
      BACKEND_AUTH_TOKEN_KEY,
    ]);

    return {
      baseUrl: normalizeBackendUrl(result[BACKEND_BASE_URL_KEY] || DEFAULT_BACKEND_BASE_URL),
      authToken: normalizeText(result[BACKEND_AUTH_TOKEN_KEY]),
    };
  } catch (error) {
    console.error("Error retrieving backend settings:", error);
    return {
      baseUrl: DEFAULT_BACKEND_BASE_URL,
      authToken: "",
    };
  }
}

export async function setBackendConfig({ baseUrl, authToken }) {
  try {
    await chrome.storage.local.set({
      [BACKEND_BASE_URL_KEY]: normalizeBackendUrl(baseUrl),
      [BACKEND_AUTH_TOKEN_KEY]: normalizeText(authToken),
    });

    return true;
  } catch (error) {
    console.error("Error storing backend settings:", error);
    return false;
  }
}

export function normalizeBackendUrl(value) {
  const text = normalizeText(value);
  if (!text) {
    return DEFAULT_BACKEND_BASE_URL;
  }

  return text.replace(/\/+$/, "");
}

function normalizeText(value) {
  return String(value || "").trim();
}