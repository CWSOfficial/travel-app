export const siteOrigins = Object.freeze({
  marketing: "https://travel-frontend-nine-mu.vercel.app",
  travel: "https://travel-frontend-app-henna.vercel.app",
});

export function siteUrl(site, path = "/") {
  const localOrigins = { marketing: "http://localhost:5175", travel: "http://localhost:5176" };
  const isLocal = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const origin = isLocal ? localOrigins[site] : siteOrigins[site];
  if (!origin) throw new Error(`Unknown DheeVoy site: ${site}`);
  return new URL(path, origin).toString();
}
