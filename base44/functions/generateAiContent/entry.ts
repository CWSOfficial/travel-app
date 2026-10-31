import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";
import { checkRateLimit, checkTokenRateLimit, getClientIp } from "../../shared/rateLimiter.ts";
import { verifySessionToken, SECRET_KEY } from "../../shared/sessionToken.ts";

/**
 * generateAiContent — the ONLY server-side entry point for the app's LLM
 * (InvokeLLM) usage. Protects integration credits by owning every prompt and
 * response schema server-side: clients may only pick a `purpose` from a fixed
 * allowlist and supply structured `input` values. No client-supplied prompt or
 * schema is ever forwarded, so a malicious client cannot run arbitrary LLM
 * calls to drain credits.
 *
 * All InvokeLLM calls run as the service role (base44.asServiceRole.integrations.
 * Core.InvokeLLM). Returns the raw InvokeLLM result (string or object) on 200;
 * returns 4xx/5xx on error so callers' existing try/catch + timeout fallbacks
 * behave exactly as they did when InvokeLLM threw client-side.
 *
 * SECURITY (credit-abuse prevention):
 *   1. createClientFromRequest — validates the Base44 platform auth token that
 *      the SDK injects. Blocks direct curl / external calls that lack a valid
 *      app session. (A client-bundled shared secret would add nothing here —
 *      it ships in the public bundle, so it was intentionally NOT used; the
 *      platform-token gate is the real boundary.)
 *   2. Session token verification — every call carries a server-signed token
 *      (issueSessionToken) whose nonce is a stable, unforgeable per-browser
 *      identity. Valid tokens gate the call; an invalid/missing token is
 *      rejected (401) because a legitimate client always obtains one via the
 *      wrapper before calling. This is the verified-identity layer that IP
 *      alone cannot provide — an attacker cannot rotate identities the way
 *      they can rotate IPs.
 *   3. Per-token rate limiting (primary) + per-IP rate limiting (secondary) —
 *      DB-backed (RateLimitBucket) so the caps hold across all function
 *      instances. The token identity is the strong primary bound; IP remains
 *      the secondary bound for any path that bypasses token issuance. The
 *      function is public-facing (guests use the AI flows on
 *      Home/Safety/Visa/Weather/etc.), so base44.auth.me() cannot be required.
 */

const RATE_LIMIT_MAX_REQUESTS = 30; // 30 LLM calls per minute per IP — enough for
                                     // a normal planning session, blocks rapid abuse
const TOKEN_RATE_LIMIT_MAX = 60; // 60 LLM calls per minute per token identity —
                                  // higher than the IP cap because a token is
                                  // server-verified (a caller can't mint new
                                  // identities the way they can rotate IPs)

// ── Guardrail prompt blocks (server-side copies of src/lib/aiGuardrails.js) ──
// Duplicated here because base44/ cannot import from src/. Keep in sync.
const GUARDRAIL_PROMPT_BLOCK = `STRICT TRUTHFULNESS RULES — follow exactly:
- You must only reference the specific facts given to you in this prompt (destination, trip length/cost, traveler count, activities). Do not invent, estimate, or state any specific price, dollar amount, coverage limit, percentage, statistic, or named provider/plan detail that was not explicitly provided to you.
- Do not use urgency, scarcity, or manipulative sales language (e.g., "limited time", "only X left", "other travelers are buying this now", "don't risk it"). Keep the tone helpful and neutral, not persuasive.
- Do not make guarantees or absolute claims about safety, coverage, or outcomes (e.g., never say "you will be fully covered" or "this guarantees your safety"). Use hedged, informational language (e.g., "this tier typically includes...", "may help with...").
- If you are not confident about a specific detail, omit it rather than guessing.`;

const FLIGHTS_GUARDRAIL_BLOCK = `${GUARDRAIL_PROMPT_BLOCK}
- Provide real, general routing guidance: the main departure airport(s) commonly used for the origin, typical connecting hub cities for this route (only if connections are commonly needed), and roughly how far ahead travellers usually start comparing fares. Do NOT invent flight numbers, exact schedule times, exact prices, seat availability, or specific airlines unless genuinely common knowledge — general directional guidance only, never fabricated specific facts.
- If a computed time-until-departure fact is provided in the prompt, reference ONLY that exact value when mentioning timing. Never estimate or describe the time until departure yourself.
- Keep recommendation_blurb under 60 words (~2–3 short sentences) and never include a price or percentage.`;

const HOTELS_GUARDRAIL_BLOCK = `${GUARDRAIL_PROMPT_BLOCK}
- Provide general, neutral accommodation guidance (e.g. "central areas tend to book up early"). Do NOT state any nightly rate, price, percentage, availability, or "deal" — you have no live pricing data.
- If a computed time-until-check-in fact is provided in the prompt, reference ONLY that exact value when mentioning timing. Never estimate or describe the time until check-in yourself.
- Keep recommendation_blurb under 60 words (~2–3 short sentences) and never include a price or percentage.`;

const WEATHER_GUARDRAIL_BLOCK = `${GUARDRAIL_PROMPT_BLOCK}
- If real weather numbers are provided to you in this prompt, you may reference ONLY those exact values. Do not invent, estimate, or state any other temperature, forecast figure, dollar amount, or percentage. If no real numbers were provided, do not state any specific temperature at all — keep the advisory practical and general (e.g. "warm", "cool evenings", "rainy season").
- Keep recommendation_blurb under 40 words (~1–2 short sentences) and never include a price or percentage.`;

const SAFETY_GUARDRAIL_BLOCK = `${GUARDRAIL_PROMPT_BLOCK}
- Never guarantee safety or claim a place is "safe" or "dangerous" in absolute terms. Use hedged, informational language and distinguish general safety from specific risk areas.
- Do not state any numeric safety score, rating, index, percentage, or crime statistic — the real safety score is shown to the user separately from official data. Provide only qualitative, hedged narrative (scam patterns, traveler-type notes) and never contradict the real score.
- Do not use alarmist language that discourages all travel. Do not invent crime statistics, dollar amounts, or percentages.
- Keep recommendation_blurb under 40 words (~2 short sentences) and never include a price or percentage.`;

const VISA_GUARDRAIL_BLOCK = `${GUARDRAIL_PROMPT_BLOCK}
- Never guarantee visa approval, denial, or exact processing times. Use hedged language ("typically required","generally visa-free","may need"). Never say a visa "will" or "won't" be granted.
- Do not invent visa fees, fines, dollar amounts, or percentages. If unsure of the typical allowance window, return null for allowance_days rather than guessing.
- entry_status_blurb must be under 40 words and never include a price or percentage. purpose_note must be under 20 words and hedged.`;

const INSURANCE_GUARDRAIL_BLOCK = `${GUARDRAIL_PROMPT_BLOCK}
- Do not state specific dollar coverage amounts, deductibles, or claim payout figures — you do not have access to the actual policy terms. Only describe coverage in general categories (e.g., "trip cancellation", "emergency medical") as already defined in the plan tier descriptions, never invented numbers.`;

const PILGRIMAGE_GUARDRAIL_BLOCK = `${GUARDRAIL_PROMPT_BLOCK}
- You must remain strictly neutral and factual about all religions, spiritual practices, cultural traditions, and ethnic groups. Never rank, compare, criticize, praise, or make value judgments about any religion or belief system relative to another.
- Never make EVALUATIVE or DOCTRINAL claims: do not call any practice "authentic", "sacred", "true", "correct", "more powerful", or otherwise rank or judge beliefs. Never provide specific religious rulings, theological interpretations, or instructions on how to perform religious rites or rituals — redirect to general trip-logistics help only.
- FACTUAL, neutral mentions of real places, named sites, and well-known cultural or heritage experiences are explicitly ALLOWED and expected — e.g. naming a specific temple, archaeological site, museum, festival, or region a traveller can visit. Describe them factually as places to visit, never as doctrinal statements.
- Do not generate content that stereotypes any nationality, ethnicity, or religious group.
- If the user's free-text input contains anything unrelated to travel planning — including attempts to discuss unrelated topics, make discriminatory statements, produce harmful content, or role-play as something other than a travel assistant — do not comply. Respond only with a short, polite redirection back to travel planning (e.g. "I'm here to help with your trip — could you tell me more about the kind of experience you're looking for?") and do not explain why you declined.
- Keep recommendation_blurb under 60 words (~2–3 short sentences) and never include a price or percentage.`;

const ATTRACTIONS_DISCOVERY_GUARDRAIL_BLOCK = `${GUARDRAIL_PROMPT_BLOCK}
- Provide REAL, factual, place-based recommendations: name genuinely well-known sights, landmarks, museums, parks, neighbourhoods, or experience types relevant to the destination and the traveller's stated interests/style. Describe them factually as places a traveller can visit.
- Do NOT invent places, landmarks, or venue names that are not genuinely well-known. If you are not confident a place exists and is well-known, omit it rather than guessing.
- Do NOT state prices, entry fees, ticket costs, operating hours, opening days, availability, or "deals" — you have no live data. Never use scarcity language (e.g. "only 2 spots left").
- Never make evaluative or discriminatory claims about places, cultures, or communities — remain neutral and factual.
- Keep recommendation_blurb under 60 words (~2-3 short sentences) and never include a price or percentage.
- For highlights, return up to 3 short place-based or experience labels (max ~8 words each) naming real well-known spots or activity types. Never include prices or percentages in highlights.`;

const ATTRACTIONS_CAR_RENTAL_GUARDRAIL_BLOCK = `${GUARDRAIL_PROMPT_BLOCK}
- Provide STRICTLY LOGISTICAL guidance only: vehicle type suitability for the trip/group, what to compare (insurance, mileage, fuel policy), and one general driving tip for the destination.
- Do NOT state specific prices, daily rates, deals, discounts, availability, or invented rental company offers — you have no live pricing or inventory data. Do not name specific rental companies or invent promotions.
- Keep recommendation_blurb under 60 words (~2-3 short sentences) and never include a price or percentage.
- For highlights, return up to 3 short logistical labels (max ~6 words each, e.g. "Compact ideal for city"). Never include prices or percentages in highlights.`;

const SUPPORT_SYSTEM_PROMPT = `You are DheeVoy's inline support assistant ("Ask DheeVoy AI"). Your primary purpose is to answer questions ONLY regarding DheeVoy app features (AI Trip Planner, fixed Curated Trips, Visa Intelligence, Safety Scores) and account support.

STRICT BOUNDARIES:
- Do NOT invent travel facts, guess booking statuses, or offer speculative advice outside DheeVoy's built-in features.
- Do NOT provide specific visa or safety guarantees — direct users to check official embassy and government foreign-travel-advice sources.

CURATED TRIP RULE:
- If a user asks to modify or customize a Curated Trip, state clearly that Curated Trips are fixed, expert-crafted packages that cannot be edited, and suggest using the AI Trip Planner for custom itineraries.

FALLBACK RULE:
- If a question cannot be answered directly from DheeVoy's platform features, instruct the user to email support@dheevoy.com or use the "Contact Our Team" form on the Help & Support page.

TONE & FORMATTING:
- Keep all answers concise (2–3 sentences max), direct, factual, and free of filler text.
- Be friendly and mobile-friendly.`;

// ── Schemas ──
const ITINERARY_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          theme: { type: "string" },
          morning: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, cost: { type: "string" } } } },
          afternoon: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, cost: { type: "string" } } } },
          evening: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, cost: { type: "string" } } } },
          accommodation: { type: "string" },
          tips: { type: "string" },
        },
      },
    },
  },
};

// Multi-city journey: one connected itinerary spanning ordered destinations.
// Returns a journey_overview blurb + per-segment day-by-day plans. Transfer days
// are flagged so the UI can render them distinctly. Same guardrail block as the
// single-destination itinerary purpose (no fabricated prices/availability).
const MULTI_CITY_ITINERARY_SCHEMA = {
  type: "object",
  properties: {
    journey_overview: { type: "string", description: "2-3 sentence overview of the whole connected journey" },
    segments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          destination: { type: "string", description: "City, Country for this segment" },
          is_transfer_arrival: { type: "boolean", description: "true if this segment's first day is primarily a transfer-in day" },
          is_transfer_departure: { type: "boolean", description: "true if this segment's last day is primarily a transfer-out day" },
          days: {
            type: "array",
            items: {
              type: "object",
              properties: {
                theme: { type: "string" },
                morning: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, cost: { type: "string" }, tags: { type: "array", items: { type: "string" } } } } },
                afternoon: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, cost: { type: "string" }, tags: { type: "array", items: { type: "string" } } } } },
                evening: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, cost: { type: "string" }, tags: { type: "array", items: { type: "string" } } } } },
                accommodation: { type: "string" },
                tips: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
  required: ["journey_overview", "segments"],
};

const DESTINATIONS_SCHEMA = {
  type: "object",
  properties: {
    destinations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          city: { type: "string" }, full_location: { type: "string" }, name: { type: "string" },
          temp_celsius: { type: "number" }, weather: { type: "string" },
          safety_rating: { type: "string" }, safety_index_score: { type: "number" }, safety_detail: { type: "string" },
          visa_requirement: { type: "string" }, visa_notes: { type: "string" }, visa_fee: { type: "string" },
          flight_cost: { type: "string" }, hotel_cost: { type: "string" }, activities_cost: { type: "string" }, total_cost: { type: "string" },
          why_recommended: { type: "string" }, type: { type: "string" },
        },
      },
    },
  },
};

const DAY_SCHEMA = {
  type: "object",
  properties: {
    theme: { type: "string" },
    morning: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, cost: { type: "string" } } } },
    afternoon: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, cost: { type: "string" } } } },
    evening: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, cost: { type: "string" } } } },
    accommodation: { type: "string" },
    tips: { type: "string" },
  },
};

const ACTIVITY_SCHEMA = {
  type: "object",
  properties: { title: { type: "string" }, description: { type: "string" }, cost: { type: "string" } },
};

const BLURB_SCHEMA = {
  type: "object",
  properties: { recommendation_blurb: { type: "string" } },
  required: ["recommendation_blurb"],
};

const ATTRACTIONS_SCHEMA = {
  type: "object",
  properties: {
    recommendation_blurb: { type: "string", description: "maximum 2-3 short sentences, no more than 60 words" },
    highlights: { type: "array", items: { type: "string" }, description: "up to 3 short labels, max 8 words each" },
  },
  required: ["recommendation_blurb", "highlights"],
};

const VISA_SAFETY_ORACLE_SCHEMA = {
  type: "object",
  properties: {
    country: { type: "string" }, country_code: { type: "string" }, region: { type: "string" },
    visa_status: { type: "string" }, visa_free_days: { type: "number" },
    safety_index_score: { type: "number" }, critical_advisories_text: { type: "string" },
    scams: { type: "string" }, best_months: { type: "string" },
  },
};

const VISA_CHECK_SCHEMA = {
  type: "object",
  properties: {
    entry_status: { type: "string", enum: ["Visa-Free", "eVisa", "Visa on Arrival", "Embassy Visa Required"] },
    entry_status_blurb: { type: "string", description: "max 40 words, hedged, references destination + passport, no prices/percentages" },
    allowance_days: { type: ["number", "null"], description: "typical max stay in days, or null if unknown" },
    purpose_note: { type: "string", description: "max 20 words, hedged, or empty string" },
  },
  required: ["entry_status", "entry_status_blurb", "allowance_days", "purpose_note"],
};

const INSURANCE_SCHEMA = {
  type: "object",
  properties: {
    recommendation_blurb: { type: "string", description: "maximum 2 short sentences, no more than ~40 words" },
    recommended_tier: { type: "string", enum: ["Basic", "Standard", "Premium"] },
    risk_note: { type: "string", description: "short note if high-risk activities require add-on, else empty string; maximum 1 short sentence, no more than ~20 words" },
  },
  required: ["recommendation_blurb", "recommended_tier", "risk_note"],
};

const TRIP_MONITOR_SCHEMA = {
  type: "object",
  properties: {
    safety_alert: { type: "object", properties: { level: { type: "string" }, title: { type: "string" }, message: { type: "string" } } },
    weather: { type: "object", properties: { current: { type: "string" }, forecast: { type: "string" } } },
    flight_status: { type: "object", properties: { status: { type: "string" }, note: { type: "string" } } },
    local_alerts: { type: "array", items: { type: "string" } },
    today_tip: { type: "string" },
  },
};

// ── Prompt builders ──
function buildMultiCityItineraryPrompt(input: any): string {
  const segs = (input.segments || [])
    .map((s: any, i: number) => `  ${i + 1}. ${s.destination} — arrive ${s.arrival_date || "TBD"}${s.departure_date ? `, depart ${s.departure_date}` : ""} (${s.nights != null ? s.nights + " nights" : "TBD"})${s.transport_type ? `; onward transport: ${s.transport_type}` : ""}`)
    .join("\n");
  const transfers = (input.segments || [])
    .slice(1)
    .map((s: any, i: number) => `${input.segments[i].destination} → ${s.destination} by ${s.transport_type || input.segments[i].transport_type || "flight"}`)
    .join("; ");
  const childAges = Array.isArray(input.child_ages) && input.child_ages.length
    ? `Child ages: ${input.child_ages.join(", ")}. `
    : "";

  // Traveller-aware guidance block
  const group = (input.group_type || "").toLowerCase();
  const hasChildren = Array.isArray(input.child_ages) && input.child_ages.length > 0;
  let travellerGuide = "";
  if (group === "family" || hasChildren) {
    travellerGuide = `TRAVELLER CONTEXT — FAMILY WITH CHILDREN:
- Prioritise manageable pacing, family-friendly attractions, age-appropriate experiences, rest opportunities, practical transport guidance, luggage considerations, and family-friendly areas.
- Tag relevant activities with concise labels such as "Family Tip", "Good for teens", "Easy with children", "Long walking day", "Allow extra transfer time", or "Book ahead".
- Keep each activity description to ONE concise sentence.`;
  } else if (group === "couple") {
    travellerGuide = `TRAVELLER CONTEXT — COUPLE:
- Emphasise scenic experiences, evening activities, quieter experiences, and romantic settings where relevant.
- Tag relevant activities with concise labels such as "Scenic", "Evening pick", "Quieter spot", or "Book ahead".
- Keep each activity description to ONE concise sentence.`;
  } else if (group === "solo") {
    travellerGuide = `TRAVELLER CONTEXT — SOLO TRAVELLER:
- Emphasise safety/practicality, efficient transport, flexible activities, and social or guided experiences where appropriate.
- Tag relevant activities with concise labels such as "Solo-friendly", "Social / guided", "Efficient route", or "Book ahead".
- Keep each activity description to ONE concise sentence.`;
  } else if (group === "group") {
    travellerGuide = `TRAVELLER CONTEXT — GROUP:
- Emphasise group booking practicality, transport coordination, reservation requirements, and meeting points.
- Tag relevant activities with concise labels such as "Group booking", "Reserve ahead", "Meeting point", or "Allow extra transfer time".
- Keep each activity description to ONE concise sentence.`;
  } else {
    travellerGuide = `Keep each activity description to ONE concise sentence.`;
  }

  const transportGuide = `TRANSFER-DAY RULES:
- Flight: lighter schedule around airport transfer; account for check-in/security/travel time; avoid heavy sightseeing immediately before departure.
- Train: allow station transfer/luggage considerations; recognise potentially long rail days.
- Car: account for driving duration/rest stops.
- Ferry: account for port arrival/check-in.
- Bus: account for longer transfer duration where relevant.
- Clearly label transport as "Suggested transport option" — do NOT fabricate exact flight numbers, train times, or prices.`;

  return `You are Dbuddy AI, an expert AI travel companion. Create a day-by-day itinerary for a CONNECTED MULTI-CITY journey. Treat the whole trip as ONE journey, not independent destinations.

Journey start (home city): ${input.start_city}
Final return city: ${input.end_city || input.start_city}
Overall dates: ${input.start_date} to ${input.end_date} (${input.total_days} days, ${input.total_nights} nights)
Travellers: ${input.num_travelers} (${input.group_type}). ${childAges}Trip pace: ${input.trip_pace}. Budget: ${input.budget}. Travel style: ${input.travel_style}.

Ordered destinations:
${segs}

Transfer legs (between destinations): ${transfers}

CRITICAL RULES:
- This is ONE connected journey. Each destination's plan must account for how many nights are available there and whether that day is a transfer day.
- Arrival days (first day at a new destination) and departure days (last day before moving on) should be LIGHTER — fewer/shorter activities, time for check-in, travel, and orientation.
- Spread activities realistically across the available nights at each destination. Do not cram an entire city into one day.
- Be specific to each destination and realistic.

${transportGuide}

${travellerGuide}

Return JSON with:
- journey_overview: 2-3 sentence overview of the whole connected journey
- segments: array (one per ordered destination), each with:
  - destination: "City, Country"
  - is_transfer_arrival: boolean (true if first day is primarily a transfer-in)
  - is_transfer_departure: boolean (true if last day is primarily a transfer-out)
  - days: array of day objects, each with theme (short title), morning (array of up to 2 activities: title, brief 1-sentence description, cost, tags), afternoon (up to 2 activities), evening (1 activity), accommodation (brief stay note), tips (one practical local tip)

${GUARDRAIL_PROMPT_BLOCK}`;
}

function buildItineraryPrompt(trip: any): string {
  return `You are Dbuddy AI, an expert AI travel companion. Create a day-by-day travel itinerary for this trip:

Destination: ${trip.selected_destination}
Departure: ${trip.departure_city}
Start date: ${trip.start_date}
Duration: ${trip.duration_days} days
Travel style: ${trip.travel_style}
Group type: ${trip.group_type} (${trip.num_travelers} travellers)
Budget: ${trip.budget}

For EACH day provide:
- theme: short title (e.g. "Arrival & Old Town")
- morning: array of 2 activities (title, brief 1-sentence description, cost)
- afternoon: array of 2 activities (title, brief 1-sentence description, cost)
- evening: array of 1 activity (title, brief 1-sentence description, cost)
- accommodation: brief stay note
- tips: one practical local tip

Be specific to the destination and realistic. Keep descriptions concise.`;
}

function buildAttractionsPrompt(input: any): string {
  const { branch, destination, step2Value, s3 } = input;
  if (branch === "tours") {
    return `You are DheeVoy's attractions assistant. A traveler is going to ${destination}, traveling as: ${step2Value}, preferred style: ${s3}. Give a concise, factual overview of genuinely well-known sights, landmarks, museums, or guided tour experiences in ${destination} that match the travel style. Name real, well-known places a traveler can visit. Return JSON: recommendation_blurb (string, max 60 words naming real well-known places/experiences), highlights (array of up to 3 short place-based or experience labels max 8 words each).

${ATTRACTIONS_DISCOVERY_GUARDRAIL_BLOCK}`;
  }
  if (branch === "things_to_do") {
    return `You are DheeVoy's things-to-do assistant. A traveler is going to ${destination}, interests: ${step2Value}, preferred pace: ${s3}. Recommend genuinely well-known sights, activities, or experiences in ${destination} relevant to the selected interests — name real landmarks, museums, parks, neighbourhoods, or well-known experience types a traveler can visit. Return JSON: recommendation_blurb (string, max 60 words naming real well-known places/experiences relevant to the interests), highlights (array of up to 3 short place-based labels max 8 words each).

${ATTRACTIONS_DISCOVERY_GUARDRAIL_BLOCK}`;
  }
  return `You are DheeVoy's car-rental assistant. A traveler is picking up a car in ${destination}, for ${step2Value}, vehicle preference: ${s3}. Give strictly logistical guidance: vehicle type suitability for the trip and group, what to compare (insurance, mileage, fuel policy), and one general driving tip for ${destination}. Return JSON: recommendation_blurb (string, max 60 words), highlights (array of up to 3 short logistical labels max 6 words each, e.g. "Compact ideal for city", "Check local driving permit").

${ATTRACTIONS_CAR_RENTAL_GUARDRAIL_BLOCK}`;
}

function buildDestinationsPrompt(input: any): string {
  const isKnownMode = input.mode === "known";
  const destinationClause = isKnownMode
    ? `The traveller SPECIFICALLY wants to visit: ${input.destination_preference}. Provide ONLY recommendations for this destination or very nearby alternatives within the same country/region.`
    : `The traveller has NOT specified a destination — recommend exactly 3 optimal global destinations ranked by safety, visa accessibility, value, and match to their travel style. Provide variety across budget tiers.`;
  const passportClause = input.passport_country
    ? `Passport: ${input.passport_country}. For EACH destination provide the REAL, ACCURATE visa requirement — e.g. "Visa-free 30 days", "eVisa required — apply online 3+ days before arrival", "Visa on arrival (USD 35)", "Embassy visa required (apply 3–6 weeks ahead)". Include any notable entry conditions or restrictions. Also include the approximate visa fee in ${input.currency_code} if applicable.`
    : `No passport provided — give general visa info.`;
  return `You are DheeVoy, an expert travel advisor. ${destinationClause}

Traveller: departing ${input.departure_city}, ${input.start_date} for ${input.duration_days} days, ${input.budget} budget, ${input.travel_style} style, ${input.group_type} (${input.num_travelers} travellers), currency ${input.currency_code}. ${passportClause}

Return exactly 3 destinations. For each provide:
- city, full_location, name (City, Country)
- temp_celsius (number, for travel month)
- weather (1-2 sentences for ${input.start_date})
- safety_rating (Very Safe/Safe/Moderate/Use Caution/High Risk), safety_index_score (0-100), safety_detail (1 sentence)
- visa_requirement, visa_notes (1 sentence), visa_fee
- flight_cost, hotel_cost, activities_cost, total_cost (in ${input.currency_code})
- why_recommended (1 sentence), type (beach/mountain/city/cultural)`;
}

// ── Purpose registry: each builds { prompt, model, schema?, addContext? } ──
type Spec = { build: (input: any) => { prompt: string; model: string; schema?: any; addContext?: boolean } };

const PURPOSES: Record<string, Spec> = {
  support_chat: {
    build: (input) => ({
      prompt: `${SUPPORT_SYSTEM_PROMPT}\n\nConversation so far:\n${input.history}\n\nAssistant:`,
      model: "gpt_5_mini",
    }),
  },
  visa_safety_oracle: {
    build: (input) => ({
      prompt: `You are a visa and travel-safety oracle. Provide real-time, accurate visa and safety info for a traveller heading to "${input.term}". Return JSON with: country, country_code (ISO alpha-2), region, visa_status (e.g. "Visa-free 30 days", "eVisa required", "Visa on arrival", "Visa required"), visa_free_days (number or 0), safety_index_score (0-100, higher = safer), critical_advisories_text (2-3 sentences on key risks and areas to avoid), scams (common tourist scams and risks in 2 sentences), best_months (e.g. "Mar–May"). Be accurate and concise.`,
      model: "gpt_5_mini",
      schema: VISA_SAFETY_ORACLE_SCHEMA,
    }),
  },
  itinerary: {
    build: (input) => ({
      prompt: buildItineraryPrompt(input.trip),
      model: "gemini_3_flash",
      schema: ITINERARY_RESPONSE_SCHEMA,
    }),
  },
  multi_city_itinerary: {
    build: (input) => ({
      prompt: buildMultiCityItineraryPrompt(input),
      model: "gemini_3_flash",
      schema: MULTI_CITY_ITINERARY_SCHEMA,
    }),
  },
  attractions_recommendation: {
    build: (input) => ({
      prompt: buildAttractionsPrompt(input),
      model: "gemini_3_flash",
      schema: ATTRACTIONS_SCHEMA,
    }),
  },
  flow_followup: {
    build: (input) => ({
      prompt: `You are Dbuddy, DheeVoy's travel assistant. The user just finished the ${input.flowContext}. They now ask: "${input.q}". Give a short, friendly, helpful travel answer (max 2 sentences). If it's off-topic, gently redirect to travel.`,
      model: "gpt_5_mini",
    }),
  },
  esim_plan_blurb: {
    build: (input) => ({
      prompt: `You are DheeVoy's eSIM assistant. A traveler is going to ${input.destination} for ${input.tripLabel}. We estimate around ${input.estimate} GB of data and recommend the ${input.plan} plan. Write ONE short, friendly sentence (max ~25 words) explaining why this plan fits their trip. Plain text only. Do not mention specific prices, gigabyte numbers, or percentages.`,
      model: "gemini_3_flash",
    }),
  },
  flights_guidance: {
    build: (input) => ({
      prompt: `You are DheeVoy's flights assistant. Traveler: flying from ${input.origin} to ${input.destination}, departing ${input.dateLabel}, ${input.tripType}, ${input.travelers} traveler(s).${input.fact} Give real, general routing guidance for this route: the main departure airport(s) commonly used for ${input.origin}, typical connecting hub cities for flights from ${input.origin} to ${input.destination} (only if connections are commonly needed for this route), and roughly how far ahead travellers usually start comparing fares. Keep it to ~2 short sentences. Do NOT invent flight numbers, exact schedule times, exact prices, or specific airlines unless genuinely common knowledge. ${FLIGHTS_GUARDRAIL_BLOCK}`,
      model: "gemini_3_flash",
      schema: BLURB_SCHEMA,
    }),
  },
  hotels_guidance: {
    build: (input) => ({
      prompt: `You are DheeVoy's hotels assistant. Traveler: staying in ${input.destination}, ${input.nightsLabel}, ${input.guests} guest(s), priorities: ${input.priorities}.${input.fact} Give a short, friendly, neutral sentence of general accommodation guidance. Plain text only — do not mention prices, rates, availability, or specific hotel names. ${HOTELS_GUARDRAIL_BLOCK}`,
      model: "gemini_3_flash",
      schema: BLURB_SCHEMA,
    }),
  },
  destinations: {
    build: (input) => ({
      prompt: buildDestinationsPrompt(input),
      model: "gemini_3_flash",
      schema: DESTINATIONS_SCHEMA,
    }),
  },
  regenerate_day: {
    build: (input) => ({
      prompt: `You are Dbuddy AI. Regenerate Day ${input.dayIdx + 1} of a trip to ${input.destinationName}. Previous theme: "${input.prevTheme}". Provide a FRESH alternative day with different activities. Return JSON: { "theme": string, "morning": [{title,description,cost}], "afternoon": [{title,description,cost}], "evening": [{title,description,cost}], "accommodation": string, "tips": string }. Destination: ${input.destinationName}. Style: ${input.travelStyle}. Budget: ${input.budget}.`,
      model: "gemini_3_flash",
      schema: DAY_SCHEMA,
    }),
  },
  alternative_activity: {
    build: (input) => ({
      prompt: `You are Dbuddy AI. Suggest ONE alternative ${input.slot} activity for a trip to ${input.destinationName}. Current activity: "${input.currentActivityTitle}". Give a DIFFERENT activity. Return JSON: { "title": string, "description": string, "cost": string }. Destination: ${input.destinationName}. Style: ${input.travelStyle}. Budget: ${input.budget}.`,
      model: "gemini_3_flash",
      schema: ACTIVITY_SCHEMA,
    }),
  },
  trip_monitor: {
    build: (input) => ({
      prompt: `You are Dbuddy AI, an AI travel monitoring system. Provide live travel monitoring update for this trip:

Destination: ${input.destination}
Travel dates: ${input.startDate} for ${input.durationDays} days
Trip status: ${input.status}
Today's date: ${input.todayDate}

Provide:
1. safety_alert: object with level ("ok", "warning", "critical"), title, message — based on current real-world conditions
2. weather: object with current (temp + conditions) and forecast (next 3 days summary) for the destination
3. flight_status: object with status (e.g. "Flights operating normally", "Some delays reported") and a note
4. local_alerts: array of 2-3 current practical travel tips/alerts specific to the destination right now (e.g. public transport strikes, local events, health advisories)
5. today_tip: one personalised Dbuddy AI tip for this traveller today`,
      model: "gemini_3_flash",
      schema: TRIP_MONITOR_SCHEMA,
      addContext: true,
    }),
  },
  visa_check: {
    build: (input) => ({
      prompt: `You are DheeVoy's visa assistant. A traveler holds a ${input.passport} passport and is travelling to ${input.destination}. Trip purpose: ${input.purposeLabel}. Trip length: ${input.tripLengthLabel}.
Based on general knowledge of this passport–destination pair, determine the likely entry status: one of "Visa-Free", "eVisa", "Visa on Arrival", "Embassy Visa Required". Use hedged language ("typically","generally","may"), never "will". Also state the typical maximum stay allowance in days commonly associated with this entry route (e.g. 90, 30), or null if genuinely unknown. Add a 1-sentence hedged note on how the stated purpose (${input.purposeLabel}) may affect entry.
Do NOT invent visa fees, processing times, dollar amounts, or percentages. The exact dates and day counts are computed separately by code and shown to the user — do not state any dates or day counts yourself.

${VISA_GUARDRAIL_BLOCK}`,
      model: "gemini_3_flash",
      schema: VISA_CHECK_SCHEMA,
    }),
  },
  weather_summary: {
    build: (input) => ({
      prompt: `You are DheeVoy's weather assistant. A traveler is going to ${input.destination}, travelling ${input.travelTimeLabel}${input.tripLengthLabel ? ` for ${input.tripLengthLabel}` : ""}. Planned activities: ${input.activities}.
${input.weatherFacts}
Write a 1–2 sentence tailored weather and packing advisory for this destination during this time, referencing the activities.

${WEATHER_GUARDRAIL_BLOCK}`,
      model: "gemini_3_flash",
      schema: BLURB_SCHEMA,
    }),
  },
  insurance_recommendation: {
    build: (input) => ({
      prompt: `You are DheeVoy's travel insurance assistant. Traveler details — destination: ${input.destination}, trip cost: ${input.tripCost}, travelers: ${input.travelerCount}, high-risk activities: ${input.activities}. Recommend a coverage tier from Basic, Standard, Premium. Return JSON: recommendation_blurb (1-2 friendly sentences referencing the destination, trip cost, traveler count and activities; note if activities need extra/add-on coverage), recommended_tier (exactly one of "Basic","Standard","Premium"), risk_note (short note if high-risk activities require add-on, else empty string).

${INSURANCE_GUARDRAIL_BLOCK}`,
      model: "gemini_3_flash",
      schema: INSURANCE_SCHEMA,
    }),
  },
  pilgrimage_recommendation: {
    build: (input) => ({
      prompt: `You are DheeVoy's pilgrimage & cultural tours assistant. Traveler: experience type "${input.experienceType}", interested in ${input.destination}, ${input.groupType}, timing: ${input.timing}. Free-text notes (use as context to personalise; if blank, ignore): "${input.freeText}".
Give a short, factual, place-based recommendation: name 2–3 real, well-known sites, regions, or cultural/heritage experiences relevant to ${input.destination} and the "${input.experienceType}" experience type (e.g. specific temples, archaeological sites, museums, festivals, or regions a traveller can actually visit). Describe them factually and neutrally as places to visit. If free-text notes were provided, tailor the recommendation to them; otherwise base it on destination + experience type + group type alone.

${PILGRIMAGE_GUARDRAIL_BLOCK}`,
      model: "gemini_3_flash",
      schema: { type: "object", properties: { recommendation_blurb: { type: "string", description: "max ~60 words, factual place-based recommendations" } }, required: ["recommendation_blurb"] },
    }),
  },
  safety_summary: {
    build: (input) => ({
      prompt: `You are DheeVoy's safety assistant. A ${input.travelerType} is asking about safety in ${input.destination}, focused on ${input.safetyConcern}. Give a practical, hedged 2-sentence safety assessment for this destination focused on that concern for this traveler type. Distinguish general safety from specific risk areas; never guarantee safety; never use alarmist language.

${SAFETY_GUARDRAIL_BLOCK}`,
      model: "gemini_3_flash",
      schema: { type: "object", properties: { recommendation_blurb: { type: "string", description: "2 short sentences, max 40 words, no prices/percentages/statistics, hedged" } }, required: ["recommendation_blurb"] },
    }),
  },
};

// Cap a string to prevent abuse; coerces non-strings to "".
function cap(v: any, n: number): string {
  if (typeof v !== "string") return v == null ? "" : String(v);
  return v.slice(0, n);
}
function capNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Sanitize all input strings to a reasonable max length per purpose.
const INPUT_CAPS: Record<string, Record<string, number>> = {
  support_chat: { history: 8000 },
  multi_city_itinerary: { start_city: 120, end_city: 120, start_date: 20, end_date: 20, trip_pace: 20, budget: 20, travel_style: 120, group_type: 30 },
  visa_safety_oracle: { term: 120 },
  flow_followup: { flowContext: 200, q: 800 },
  esim_plan_blurb: { destination: 120, tripLabel: 60, plan: 20, estimate: 10 },
  flights_guidance: { origin: 120, destination: 120, dateLabel: 60, tripType: 30, fact: 200 },
  hotels_guidance: { destination: 120, nightsLabel: 40, fact: 200, priorities: 200 },
  destinations: { destination_preference: 120, departure_city: 120, start_date: 20, budget: 20, travel_style: 30, group_type: 30, passport_country: 60, currency_code: 10 },
  regenerate_day: { destinationName: 120, prevTheme: 120, travelStyle: 30, budget: 20 },
  alternative_activity: { slot: 20, destinationName: 120, currentActivityTitle: 200, travelStyle: 30, budget: 20 },
  trip_monitor: { destination: 120, startDate: 20, status: 30, todayDate: 20 },
  visa_check: { passport: 60, destination: 120, purposeLabel: 60, tripLengthLabel: 40 },
  weather_summary: { destination: 120, travelTimeLabel: 40, tripLengthLabel: 40, activities: 300, weatherFacts: 400 },
  insurance_recommendation: { destination: 120, tripCost: 40, activities: 300 },
  pilgrimage_recommendation: { experienceType: 60, destination: 120, groupType: 40, timing: 40, freeText: 1000 },
  safety_summary: { travelerType: 40, destination: 120, safetyConcern: 120 },
  attractions_recommendation: { branch: 20, destination: 120, step2Value: 200, s3: 120 },
};

function sanitizeInput(purpose: string, input: any): any {
  const caps = INPUT_CAPS[purpose] || {};
  const out: any = {};
  for (const k of Object.keys(input || {})) {
    out[k] = caps[k] != null ? cap(input[k], caps[k]) : input[k];
  }
  // numeric coercions
  if (purpose === "esim_plan_blurb") out.estimate = capNum(input.estimate);
  if (purpose === "flights_guidance") out.travelers = capNum(input.travelers);
  if (purpose === "hotels_guidance") out.guests = capNum(input.guests);
  if (purpose === "destinations") { out.duration_days = capNum(input.duration_days); out.num_travelers = capNum(input.num_travelers); out.currency_code = cap(cap(input.currency_code, 10), 10); }
  if (purpose === "multi_city_itinerary") { out.total_days = capNum(input.total_days); out.total_nights = capNum(input.total_nights); out.num_travelers = capNum(input.num_travelers); }
  if (purpose === "regenerate_day") out.dayIdx = capNum(input.dayIdx);
  if (purpose === "trip_monitor") { out.durationDays = capNum(input.durationDays); }
  return out;
}

export default async function (req: Request): Promise<Response> {
  try {
    // ── Layer 1: Verify the request came through the Base44 platform ──
    // createClientFromRequest extracts the Base44 auth headers that the SDK
    // injects. If the request has no valid platform token, it throws.
    let base44;
    try {
      base44 = createClientFromRequest(req);
    } catch {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const purpose: string = body.purpose;
    const sessionToken: string | undefined = body._session_token;

    // ── Layer 2: Verify the server-signed session token ──
    // The client obtains this from issueSessionToken; a valid token proves the
    // caller is a real browser session and yields a stable identity (the nonce)
    // used for per-user rate limiting below. An invalid/expired token is a
    // hard reject — the wrapper always attaches one, so a missing token means
    // a direct/abusive caller bypassing the wrapper.
    const secret = secrets.get(SECRET_KEY);
    if (!secret) {
      console.error("generateAiContent: SESSION_TOKEN_SECRET not configured");
      return Response.json({ error: "Server not configured" }, { status: 500 });
    }
    const identity = await verifySessionToken(secret, sessionToken);
    if (!identity.valid) {
      return Response.json({ error: "Invalid or missing session token" }, { status: 401 });
    }

    // ── Layer 3: Per-token rate limiting (primary, verified identity) ──
    if (
      !(await checkTokenRateLimit(
        base44,
        "generateAiContent",
        identity.nonce,
        60_000,
        TOKEN_RATE_LIMIT_MAX,
      ))
    ) {
      return Response.json(
        { error: "Rate limit exceeded. Please slow down." },
        { status: 429 },
      );
    }

    // ── Layer 4: Per-IP rate limiting (secondary bound) ──
    // Caps callers who somehow bypass token issuance (e.g. a direct caller
    // that passes a token harvested once but rotates IPs). Holds across all
    // function instances via the DB-backed bucket.
    const clientIp = getClientIp(req);
    if (!(await checkRateLimit(base44, "generateAiContent", clientIp, 60_000, RATE_LIMIT_MAX_REQUESTS))) {
      return Response.json(
        { error: "Rate limit exceeded. Please slow down." },
        { status: 429 },
      );
    }
    const spec = PURPOSES[purpose];
    if (!spec) {
      return Response.json({ error: "unknown_purpose" }, { status: 400 });
    }
    const input = sanitizeInput(purpose, body.input || {});
    const { prompt, model, schema, addContext } = spec.build(input);

    const invokeArgs: any = { prompt, model };
    if (schema) invokeArgs.response_json_schema = schema;
    if (addContext) invokeArgs.add_context_from_internet = true;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM(invokeArgs);
    return Response.json(result);
  } catch (error: any) {
    console.error("generateAiContent error:", error?.message);
    return Response.json({ error: "internal_error", message: error?.message || "error" }, { status: 500 });
  }
}