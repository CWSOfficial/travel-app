// Convert an ISO 3166-1 alpha-2 country code into its flag emoji.
export function flagEmoji(code) {
  if (!code || typeof code !== "string") return "🌍";
  const cc = code.trim().toUpperCase();
  if (cc.length !== 2 || !/^[A-Z]{2}$/.test(cc)) return "🌍";
  const A = 0x1f1e6; // regional indicator A
  const base = "A".charCodeAt(0);
  return String.fromCodePoint(
    A + (cc.charCodeAt(0) - base),
    A + (cc.charCodeAt(1) - base)
  );
}

// Map a visa_status string to a consistent badge colour palette.
// Pass isUkFcdoSource=true when the data comes from DestinationSafetyCache
// (populated by syncCountrySafetyData from UK FCDO gov.uk) — the label then
// honestly reflects that the visa status applies to British passport holders.
export function visaBadge(status, isUkFcdoSource = false) {
  const raw = status || "";
  const s = raw.toLowerCase();
  const suffix = isUkFcdoSource ? " (UK passport)" : "";
  if (s.includes("free")) return { bg: "bg-emerald-500/15", text: "text-emerald-300", label: `Visa-free${suffix}` };
  if (s.includes("arrival")) return { bg: "bg-sky-500/15", text: "text-sky-300", label: `Visa on arrival${suffix}` };
  if (s.includes("e-visa") || s.includes("evisa")) return { bg: "bg-amber-500/15", text: "text-amber-300", label: `eVisa${suffix}` };
  if (s.includes("required")) return { bg: "bg-rose-500/15", text: "text-rose-300", label: `Visa required${suffix}` };
  return { bg: "bg-slate-500/15", text: "text-slate-300", label: raw || "Check" };
}

// Strip trailing "... travel advice" suffixes so widget card titles show only
// the country name (e.g. "Thailand travel advice" → "Thailand").
export function cleanCountryName(name) {
  if (!name) return name;
  return String(name)
    .replace(/\s*(foreign\s+)?travel\s+advi\w*.*$/i, "")
    .replace(/_/g, " ")
    .trim();
}

// Humanise raw advisory values: arrays become a joined list, snake_case /
// JSON-array strings become clean sentence case (e.g.
// ["avoid_all_but_essential_travel_to_parts"] → "Avoid all but essential travel to parts").
export function humanizeAdvisory(val) {
  if (Array.isArray(val)) return val.map(humanizeAdvisory).join("; ");
  if (val !== null && typeof val === "object") return JSON.stringify(val);
  let s = String(val).trim();
  if (s.startsWith("[") && s.endsWith("]")) {
    try {
      return humanizeAdvisory(JSON.parse(s));
    } catch {
      /* fall through */
    }
  }
  if (s.includes("_")) {
    const lower = s.replace(/_/g, " ").trim().toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
  return s;
}