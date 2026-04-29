export function capitalizeWords(str) {
  return String(str || "")
    .trim()
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
}
