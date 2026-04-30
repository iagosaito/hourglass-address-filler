// Common Brazilian street prefixes stripped before building search variants.
// Hourglass stores names with mixed prefixes ("R.", "Rua", "Av.") and the
// search is LIKE-style, so dropping the prefix yields better recall.
const STREET_PREFIXES = [
  "rua", "r.", "r",
  "avenida", "av.", "av",
  "alameda", "al.", "al",
  "travessa", "tv.", "tv",
  "praça", "praca", "pça", "pca",
  "estrada", "est.", "est",
  "rodovia", "rod.", "rod",
  "largo", "lgo.", "lgo",
];

export function buildSearchVariants(street, number) {
  if (typeof street !== "string" || !street.trim()) {
    throw new TypeError(`street must be a non-empty string, got: ${street}`);
  }
  if (typeof number !== "string" || !number.trim()) {
    throw new TypeError(`number must be a non-empty string, got: ${number}`);
  }

  const core = stripStreetPrefix(street.trim());
  const lastWord = lastWordOf(core);
  const num = number.trim();

  const variants = [
    `${core} ${num}`,
    removeAccents(`${core} ${num}`),
    `${lastWord}, ${num}`,
    removeAccents(`${lastWord}, ${num}`),
  ];

  return [...new Set(variants.map((v) => v.trim()).filter(Boolean))];
}

function stripStreetPrefix(street) {
  const lower = street.toLowerCase();
  for (const prefix of STREET_PREFIXES) {
    const withSpace = `${prefix} `;
    if (lower.startsWith(withSpace)) {
      return street.slice(withSpace.length).trim();
    }
  }
  return street;
}

function lastWordOf(text) {
  const words = text.split(/\s+/).filter(Boolean);
  return words[words.length - 1] || text;
}

export function removeAccents(text) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}
