// Reusable multi-city journey helpers — pure functions, no React.
// Used by the MultiCity builder, Journey Overview, and future features
// (Trip Guardian, destination safety, disruption handling, DMC coordination).

// ── Date helpers ──
export const daysBetween = (a, b) => {
  if (!a || !b) return 0;
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db - da) / 86400000);
};

export const addDays = (dateStr, n) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
};

export const formatDateShort = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

// ── Validation ──
export const validateJourney = ({ startCity, stops, endCity }) => {
  const errors = [];
  if (!startCity || !startCity.trim()) errors.push("Add a starting city.");
  if (!stops || stops.length < 2) {
    errors.push("A multi-city trip needs at least 2 destinations.");
  }
  if (!endCity || !endCity.trim()) errors.push("Add a final return city.");

  (stops || []).forEach((s, i) => {
    const label = `Destination ${i + 1}`;
    if (!s.destination || !s.destination.trim()) errors.push(`${label}: choose a city.`);
    if (!s.arrival_date) errors.push(`${label}: add an arrival date.`);
    if (!s.departure_date) errors.push(`${label}: add a departure date.`);
    if (s.arrival_date && s.departure_date && daysBetween(s.arrival_date, s.departure_date) < 0) {
      errors.push(`${label}: departure can't be before arrival.`);
    }
  });

  for (let i = 1; i < (stops || []).length; i++) {
    const prev = stops[i - 1];
    const cur = stops[i];
    if (prev.departure_date && cur.arrival_date && daysBetween(prev.departure_date, cur.arrival_date) < 0) {
      errors.push(`Destination ${i + 1} can't start before Destination ${i} ends.`);
    }
  }

  for (let i = 0; i < (stops || []).length; i++) {
    const cur = (stops[i].destination || "").toLowerCase().trim();
    if (i > 0) {
      const prev = (stops[i - 1].destination || "").toLowerCase().trim();
      if (cur && prev && cur === prev) {
        errors.push(`Destination ${i + 1} is the same as the previous stop.`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
};

// ── Derived journey metrics ──
export const computeJourneyMetrics = ({ stops }) => {
  const destinations = (stops || []).filter((s) => s.destination && s.destination.trim());
  const destinationCount = destinations.length;
  const transferLegs = Math.max(0, destinationCount - 1);

  let totalNights = 0;
  let totalDays = 0;
  destinations.forEach((s) => {
    const n = s.arrival_date && s.departure_date ? daysBetween(s.arrival_date, s.departure_date) : 0;
    totalNights += Math.max(0, n);
  });
  if (destinations.length > 0) {
    const first = destinations[0].arrival_date;
    const last = destinations[destinations.length - 1].departure_date;
    if (first && last) totalDays = daysBetween(first, last) + 1;
  }
  totalDays = Math.max(totalDays, totalNights + 1);

  return { destinationCount, transferLegs, totalNights, totalDays };
};

// ── Traveller context (family/couple/solo/group + children) ──
export const travellerContext = (travellers = {}) => {
  const group = (travellers.group_type || "").toLowerCase();
  const adults = Number(travellers.adults != null ? travellers.adults : travellers.num_travelers || 1);
  const children = Number(travellers.children || 0);
  const childAges = Array.isArray(travellers.child_ages) ? travellers.child_ages : [];
  const hasChildren = children > 0 || childAges.length > 0;
  const youngChildren = childAges.some((a) => Number(a) > 0 && Number(a) < 8);
  const teens = childAges.some((a) => Number(a) >= 13 && Number(a) <= 17);
  return { group, adults, children, hasChildren, youngChildren, teens, childAges };
};

// ── Deterministic journey intelligence (no AI) ──
// Pace scale: RELAXED → BALANCED → FAST-PACED → HECTIC
// Based on avg nights/destination, transfer frequency, traveller type, children.
export const PACE_LABELS = ["RELAXED", "BALANCED", "FAST-PACED", "HECTIC"];

// Map legacy pace labels (MODERATE/BUSY/VERY BUSY) to the new scale so old
// saved trips still render sensibly without modifying stored records.
export const normalizePaceLabel = (label) => {
  if (!label) return "BALANCED";
  const u = String(label).toUpperCase();
  if (u === "RELAXED") return "RELAXED";
  if (u === "BALANCED") return "BALANCED";
  if (u === "FAST-PACED" || u === "FAST PACED") return "FAST-PACED";
  if (u === "HECTIC") return "HECTIC";
  if (u === "MODERATE") return "BALANCED";
  if (u === "BUSY") return "FAST-PACED";
  if (u === "VERY BUSY") return "HECTIC";
  return "BALANCED";
};

export const computeJourneyIntelligence = (metrics, travellers = {}, segments = []) => {
  const { totalDays, totalNights, destinationCount, transferLegs } = metrics;
  if (!destinationCount || !totalDays) {
    return { label: "BALANCED", level: 1, explanation: "", bestFor: "", watchOut: "", warning: null };
  }
  const avgNights = (totalNights || 0) / destinationCount;
  const transfersPerWeek = (transferLegs / Math.max(1, totalDays)) * 7;
  const t = travellerContext(travellers);

  let level;
  if (avgNights >= 5 && transfersPerWeek < 1.5) level = 0;
  else if (avgNights >= 3 && transfersPerWeek < 3) level = 1;
  else if (avgNights >= 2) level = 2;
  else level = 3;

  // Young children make a packed pace feel more hectic.
  if (t.youngChildren && level >= 1 && level < 3) level += 1;
  // Solo travellers tend to tolerate a faster pace.
  if (t.group === "solo" && level > 0 && avgNights >= 2) level -= 1;

  level = Math.max(0, Math.min(3, level));
  const label = PACE_LABELS[level];

  const explanation = `${destinationCount} destinations across ${totalDays} days with ${transferLegs} transfer${transferLegs !== 1 ? "s" : ""}. ` + {
    0: "A leisurely pace with enough time to settle into each stop.",
    1: "Enough time to explore each stop without changing accommodation too often.",
    2: "A brisk pace — you'll be on the move regularly.",
    3: "Frequent destination changes and limited recovery time.",
  }[level];

  const bestFor = {
    0: "Travellers who want depth over breadth.",
    1: t.hasChildren ? "Families who want sightseeing with reasonable downtime." : "Couples and friends who want sightseeing with downtime.",
    2: "Experienced travellers who like staying on the move.",
    3: "Only for travellers who thrive on constant movement.",
  }[level];

  // Watch out: tightest stop, longest transfer, or reduce-stops advice.
  let watchOut = "";
  if (level === 3) {
    watchOut = "This journey involves frequent destination changes. Consider removing one stop or extending the trip.";
  } else if (segments.length) {
    const withNights = segments
      .map((s) => ({
        city: s.destination_city || splitLocation(s.destination || s.destination_full || "").city,
        nights: s.nights != null ? s.nights : (s.arrival_date && s.departure_date ? daysBetween(s.arrival_date, s.departure_date) : 0),
      }))
      .filter((x) => x.city);
    withNights.sort((a, b) => a.nights - b.nights);
    const tightest = withNights[0];
    if (tightest && tightest.nights <= 2) {
      watchOut = `${tightest.city} is the tightest stay at ${tightest.nights} night${tightest.nights !== 1 ? "s" : ""} — consider extending if you want more time there.`;
    } else if (transferLegs >= 3) {
      let longest = null;
      for (let i = 0; i < segments.length - 1; i++) {
        const a = segments[i].departure_date;
        const b = segments[i + 1].arrival_date;
        if (a && b) {
          const gap = daysBetween(a, b);
          if (!longest || gap > longest.gap) {
            longest = {
              gap,
              from: splitLocation(segments[i].destination || "").city,
              to: splitLocation(segments[i + 1].destination || "").city,
            };
          }
        }
      }
      if (longest && longest.gap >= 1) {
        watchOut = `${longest.from} → ${longest.to} is the longest transfer in this journey.`;
      }
    }
  }

  const warning =
    level === 3
      ? "This journey involves frequent destination changes and limited recovery time. Consider removing one stop or extending the trip."
      : level === 2
        ? "This is a packed itinerary — consider adding rest days if you prefer a slower pace."
        : null;

  return { label, level, explanation, bestFor, watchOut, warning };
};

// Backward-compatible computePace wrapper.
export const computePace = (metrics, travellers = {}, segments = []) => {
  const intel = computeJourneyIntelligence(metrics, travellers, segments);
  return { label: intel.label, level: intel.level, warning: intel.warning };
};

// Transport hint — short suggestion label for how a leg affects the day.
export const transportHint = (transportType) => {
  switch ((transportType || "").toLowerCase()) {
    case "flight":
      return { label: "Flight transfer", note: "Allow time for airport transfer, check-in and security." };
    case "train":
      return { label: "Rail transfer", note: "Account for station transfer and luggage." };
    case "bus":
      return { label: "Bus transfer", note: "Longer transfer duration — plan for rest stops." };
    case "car":
      return { label: "Drive transfer", note: "Account for driving duration and rest stops." };
    case "ferry":
      return { label: "Ferry transfer", note: "Arrive at port ahead of check-in." };
    default:
      return { label: "Transfer", note: "Allow time for travel between stops." };
  }
};

// ── Current / next / completed segment context ──
export const computeJourneyContext = (segments, today = new Date()) => {
  const todayStr =
    today instanceof Date ? today.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

  const sorted = [...(segments || [])].sort((a, b) => a.sequence_number - b.sequence_number);
  let currentIndex = -1;
  sorted.forEach((s) => {
    const arr = s.arrival_date;
    const dep = s.departure_date;
    if (arr && dep && daysBetween(arr, todayStr) >= 0 && daysBetween(todayStr, dep) >= 0) {
      currentIndex = sorted.indexOf(s);
    } else if (arr && !dep && daysBetween(arr, todayStr) >= 0) {
      currentIndex = sorted.indexOf(s);
    }
  });

  const completed = currentIndex >= 0 ? sorted.slice(0, currentIndex) : [];
  const upcoming = currentIndex >= 0 ? sorted.slice(currentIndex + 1) : sorted;
  const current = currentIndex >= 0 ? sorted[currentIndex] : null;
  const next = currentIndex >= 0 && currentIndex + 1 < sorted.length ? sorted[currentIndex + 1] : null;
  const nextSegment = next || (currentIndex < 0 ? sorted[0] : null);

  return {
    currentIndex,
    current,
    next: nextSegment,
    completed,
    upcoming,
    totalSegments: sorted.length,
    completedCount: completed.length,
    upcomingCount: upcoming.length,
  };
};

// ── Split a "City, Country" string into parts ──
export const splitLocation = (label) => {
  if (!label) return { city: "", country: "" };
  const parts = String(label).split(",").map((p) => p.trim());
  return { city: parts[0] || "", country: parts.slice(1).join(", ").trim() };
};