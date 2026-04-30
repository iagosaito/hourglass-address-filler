import { buildSearchVariants } from "./addressSearchQuery.js";

// Tries each query variant in order, stops at the first non-empty result.
// Returns:
//   { status: "none", matches: [], triedQueries }       — nothing matched
//   { status: "one",  matches: [a], query, triedQueries }
//   { status: "many", matches: [...], query, triedQueries }
export async function findAddressToDelete(candidate, deps) {
  if (!candidate || typeof candidate !== "object") {
    throw new TypeError(`candidate must be an object, got: ${candidate}`);
  }
  if (!deps || typeof deps.searchAddresses !== "function") {
    throw new TypeError("deps.searchAddresses must be a function");
  }

  const variants = buildSearchVariants(candidate.street, candidate.number);
  const triedQueries = [];

  for (const query of variants) {
    triedQueries.push(query);
    const results = await deps.searchAddresses(query, { xsrfToken: deps.xsrfToken });
    if (Array.isArray(results) && results.length > 0) {
      const status = results.length === 1 ? "one" : "many";
      return { status, matches: results, query, triedQueries };
    }
  }

  return { status: "none", matches: [], triedQueries };
}
