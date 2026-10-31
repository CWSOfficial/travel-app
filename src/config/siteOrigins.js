const local = import.meta.env.DEV;
export const siteOrigins = Object.freeze({
  marketing: local ? "http://localhost:5175" : "https://dheevoy.com",
  travel: local ? "http://localhost:5176" : "https://app.dheevoy.com",
});
export function siteUrl(site, path = "/") {
  const origin = siteOrigins[site];
  if (!origin) throw new Error(`Unknown DheeVoy site: ${site}`);
  return new URL(path, origin).toString();
}
