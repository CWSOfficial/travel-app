// Shared presentation helpers for the curated-trip package template.
// All values are derived from existing curated_trips entity data — nothing fabricated.
import {
  Mountain, Waves, Landmark, Heart, Crown, Gem, Sparkles, Bird,
  Users, Utensils, Compass, Church, Trees, Camera,
} from "lucide-react";

export const parseBullets = (t) => {
  if (!t) return [];
  return t
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
};

// Split a long paragraph into sentence-based bullet items without breaking
// abbreviations (Mr., Dr., St.) or decimal numbers.
const ABBREV_RE = /\b(Mr|Mrs|Ms|Dr|St|Mt|No|Inc|Ltd|Co|Jr|Sr|vs|etc|e\.g|i\.e|U\.S|U\.K)\./gi;
const splitSentences = (text) => {
  if (!text) return [];
  let s = text.replace(/(\d)\.(\d)/g, "$1\u0001$2");        // protect decimals
  s = s.replace(ABBREV_RE, (m) => m.replace(".", "\u0001")); // protect abbrevs
  return s
    .split(/\.\s+/)
    .map((p) => p.replace(/\u0001/g, ".").trim())
    .filter(Boolean);
};

// Parse a raw itinerary description into structured bullets + stay + meals.
// Pulls out explicit "Stay:" and "Meals:" lines; splits long multi-sentence
// segments into readable bullets. Never invents content.
export const parseItinerary = (desc) => {
  if (!desc) return { bullets: [], stay: null, meals: null };
  const segments = desc
    .split(/[\u2022\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  let stay = null, meals = null;
  const bullets = [];
  for (const seg of segments) {
    const stayMatch = seg.match(/^Stay\s*[:\-]\s*(.+)/i);
    if (stayMatch && !stay) { stay = stayMatch[1].trim(); continue; }
    const mealMatch = seg.match(/^(Meals|Breakfast|Lunch|Dinner)\s*[:\-]\s*(.+)/i);
    if (mealMatch && !meals) { meals = seg.trim(); continue; }
    if (seg.length > 90 && /\.\s+/.test(seg)) {
      bullets.push(...splitSentences(seg));
    } else {
      bullets.push(seg);
    }
  }
  return { bullets, stay, meals };
};

// Deterministically assign one package image to each itinerary day.
// Ensures no two consecutive days share the same image when >1 photo exists.
export const assignDayImages = (numDays, photos) => {
  const imgs = (photos || []).filter(Boolean);
  if (imgs.length === 0 || numDays <= 0) return [];
  if (imgs.length === 1) return Array(numDays).fill(imgs[0]);
  const result = new Array(numDays);
  let prev = -1;
  for (let i = 0; i < numDays; i++) {
    let idx = i % imgs.length;
    if (idx === prev) idx = (idx + 1) % imgs.length;
    result[i] = imgs[idx];
    prev = idx;
  }
  return result;
};

export const serviceLabel = (v) =>
  v === "dfy" ? "Done For You" : v === "dwy" ? "Done With You" : "";

export const serviceSubLabel = (v) =>
  v === "dfy" ? "fully-guided experience" : v === "dwy" ? "guided collaboration" : "curated experience";

const TAG_ICONS = {
  cultural: Landmark,
  heritage: Landmark,
  adventure: Mountain,
  offbeat: Compass,
  beach: Waves,
  wildlife: Bird,
  nature: Trees,
  family: Users,
  "small-group": Users,
  "all-inclusive": Utensils,
  honeymoon: Heart,
  luxury: Crown,
  religious: Church,
  photography: Camera,
};

// Build up to 4 highlight cards from package tags, falling back to itinerary
// day titles when fewer than 3 tags are available.
export const buildHighlights = (trip) => {
  const tags = trip?.tags || [];
  const out = [];
  const seen = new Set();
  for (const tag of tags) {
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    const Icon = TAG_ICONS[key] || Sparkles;
    const label = tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    out.push({ icon: Icon, label });
    seen.add(key);
    if (out.length >= 4) break;
  }
  if (out.length < 3 && trip?.itinerary_days?.length) {
    for (const d of trip.itinerary_days) {
      if (!d.title) continue;
      const label = d.title.split(/[-–—:|]/)[0].trim();
      const key = label.toLowerCase();
      if (!label || seen.has(key)) continue;
      out.push({ icon: Compass, label });
      seen.add(key);
      if (out.length >= 4) break;
    }
  }
  return out.slice(0, 4);
};

export const formatPerPerson = (trip) => {
  const cur = trip?.currency || "USD";
  const p = trip?.price_per_person;
  if (p != null && p !== "" && !isNaN(Number(p))) {
    return { currency: cur, amount: Number(p) };
  }
  return null;
};

export const nightsFromDays = (days) => {
  const d = Number(days);
  if (!d || d < 1) return null;
  return Math.max(0, d - 1);
};