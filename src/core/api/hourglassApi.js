const DEFAULT_TERRITORIES_URL = "https://app.hourglass-app.com/api/v0.2/scheduling/territory";
const DEFAULT_ADDRESSES_URL = "https://app.hourglass-app.com/api/v0.2/scheduling/territory/addresses";

function buildHeaders(xsrfToken, extra = {}) {
  const headers = {
    Accept: "application/json",
    ...extra,
  };

  if (xsrfToken) {
    headers["X-Hourglass-XSRF-Token"] = xsrfToken;
  }

  return headers;
}

export async function getTerritories(opts = {}) {
  const { baseUrl = DEFAULT_TERRITORIES_URL, xsrfToken, includeCredentials = true } = opts;
  const token = xsrfToken ?? getXsrfFromDocumentCookie();
  const res = await fetch(baseUrl, {
    method: "GET",
    headers: buildHeaders(token),
    credentials: includeCredentials ? "include" : "omit",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`getTerritories failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function createAddress(newAddressReq, opts = {}) {
  if (!newAddressReq || typeof newAddressReq !== "object") {
    throw new TypeError("newAddressReq must be an object");
  }

  const { baseUrl = DEFAULT_ADDRESSES_URL, xsrfToken, includeCredentials = true } = opts;
  const token = xsrfToken ?? getXsrfFromDocumentCookie();
  const res = await fetch(baseUrl, {
    method: "PUT",
    headers: buildHeaders(token, { "Content-Type": "application/json" }),
    credentials: includeCredentials ? "include" : "omit",
    body: JSON.stringify(newAddressReq),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`createAddress failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function deleteAddress(addressId, opts = {}) {
  if (!addressId) {
    throw new TypeError(`addressId must be a non-empty value, got: ${addressId}`);
  }

  const { baseUrl = DEFAULT_ADDRESSES_URL, xsrfToken, includeCredentials = true } = opts;
  const token = xsrfToken ?? getXsrfFromDocumentCookie();
  const res = await fetch(`${baseUrl}/${addressId}`, {
    method: "DELETE",
    headers: buildHeaders(token),
    credentials: includeCredentials ? "include" : "omit",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`deleteAddress failed: ${res.status} ${text}`);
  }

  return res.status === 204 ? null : res.json();
}

export function getXsrfFromCookieString(cookieString = "") {
  if (!cookieString) {
    return null;
  }

  const parts = cookieString.split(";").map((part) => part.trim());
  for (const part of parts) {
    const [name, ...rest] = part.split("=");
    if (!name) {
      continue;
    }

    if (name.toLowerCase() === "x-hourglass-xsrf-token") {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}

export function getXsrfFromDocumentCookie() {
  if (typeof document === "undefined") {
    return null;
  }

  return getXsrfFromCookieString(document.cookie || "");
}