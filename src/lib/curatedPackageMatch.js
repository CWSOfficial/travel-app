// Reusable DMC curated-package matching foundation for future mix-and-match
// segment fulfilment. ARCHITECTURE ONLY — not activated in the UI yet.
//
// Future matching criteria (implemented here as a pure scoring function so the
// UI can switch it on once DMC inventory is sufficient):
//   - TripSegment destination vs package destination
//   - segment dates vs package availability
//   - traveller count / child ages vs package group-size bounds
//   - budget / travel style vs package tags
//
// No automatic package assignment happens today. No fake recommendations are
// shown when no real match exists. The UI links to the curated-trips listing
// only, never to a fabricated specific package.

import { splitLocation } from "@/lib/journeyContext";

const textMatch = (a, b) => {
  const A = String(a || "").toLowerCase().trim();
  const B = String(b || "").toLowerCase().trim();
  if (!A || !B) return 0;
  if (A === B) return 1;
  if (A.includes(B) || B.includes(A)) return 0.8;
  // word overlap
  const aw = A.split(/\s+/);
  const bw = B.split(/\s+/);
  const overlap = aw.filter((w) => bw.includes(w) && w.length > 3).length;
  return Math.min(0.6, overlap * 0.2);
};

// Score one curated_trips package against one TripSegment. Returns { score, reasons[] }.
// HARD GATE: destination city OR country must match meaningfully (>= 0.5 = substring
// match). Prevents irrelevant packages — e.g. an Ooty/Nilgiris package for a
// Porto/Stockholm journey. If no meaningful match, returns score 0 (no recommendation).
export const scorePackageForSegment = (pkg, segment, travellers = {}) => {
  if (pkg.published === false) return { score: 0, reasons: [] };

  const segDest = segment.destination_full || segment.destination_city || segment.destination;
  const segParts = splitLocation(segDest);
  const pkgParts = splitLocation(pkg.destination);

  const cityScore = textMatch(segParts.city, pkgParts.city);
  const countryScore = textMatch(segParts.country, pkgParts.country);
  const fullScore = textMatch(segDest, pkg.destination);
  const destScore = Math.max(cityScore, countryScore, fullScore);

  // HARD GATE: require at least a substring match — no random inventory
  if (destScore < 0.5) return { score: 0, reasons: [] };

  let score = destScore * 50;
  const reasons = [];
  if (cityScore >= 0.8) reasons.push("destination city match");
  else if (countryScore >= 0.8) reasons.push("destination country match");
  else reasons.push("destination match");

  // Duration fit
  const segNights = segment.nights != null ? segment.nights : 0;
  if (pkg.days && segNights) {
    const pkgNights = Math.max(0, Number(pkg.days) - 1);
    if (pkgNights > 0) {
      const ratio = Math.min(pkgNights, segNights) / Math.max(pkgNights, segNights);
      score += ratio * 15;
      if (ratio > 0.7) reasons.push("duration fit");
    }
  }

  // Group size fit
  const travelers = Number(travellers.num_travelers || (travellers.adults || 0) + (travellers.children || 0) || 1);
  if (pkg.min_group_size != null && pkg.max_group_size != null) {
    if (travelers >= pkg.min_group_size && travelers <= pkg.max_group_size) {
      score += 10;
      reasons.push("group size fit");
    }
  }

  // Budget / style tag overlap
  const tags = Array.isArray(pkg.tags) ? pkg.tags : [];
  const style = Array.isArray(travellers.travel_style) ? travellers.travel_style : [];
  const tagOverlap = tags.filter((t) => style.includes(t)).length;
  score += tagOverlap * 5;

  return { score: Math.round(score), reasons };
};

// Rank published packages against a segment. Returns sorted list of
// { package, score, reasons } with score > 0. Caller decides the cutoff.
export const matchCuratedPackagesForSegment = (packages, segment, travellers = {}) => {
  if (!packages || !segment) return [];
  return packages
    .map((pkg) => ({ package: pkg, ...scorePackageForSegment(pkg, segment, travellers) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
};

// Match across all segments of a journey. Returns a map of segmentIndex → ranked matches.
export const matchPackagesForJourney = (packages, segments, travellers = {}) => {
  if (!packages || !segments) return {};
  const out = {};
  segments.forEach((seg, i) => {
    const matches = matchCuratedPackagesForSegment(packages, seg, travellers);
    if (matches.length) out[i] = matches;
  });
  return out;
};