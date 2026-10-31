// Normalizes a free-text destination into a URL-friendly slug for affiliate
// deep-link construction, e.g. "United Kingdom" → "united-kingdom",
// "Japan" → "japan", "São Paulo" → "sao-paulo".
export function destinationSlug(destination = "") {
  return String(destination || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}