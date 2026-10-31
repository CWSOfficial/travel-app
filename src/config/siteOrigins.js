export const siteOrigins = Object.freeze({
  marketing: "https://travel-frontend-nine-mu.vercel.app",
  travel: "https://travel-frontend-app-henna.vercel.app",
});

export function siteUrl(site, path = "/") {
  const origin = siteOrigins[site];
  if (!origin) throw new Error(`Unknown DheeVoy site: ${site}`);
  return new URL(path, origin).toString();
}
