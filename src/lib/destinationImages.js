// Destination & activity image selection for the Multi-City Journey Engine.
// Reuses the same Unsplash-URL approach as the curated-trip package template
// (src/components/curated/detail/helpers.js → assignDayImages) and the
// Popular Destinations cards (src/lib/destinationPhotos.js).
//
// Images are chosen deterministically by destination + activity keyword so the
// same journey always renders the same images (cacheable, no API calls).
// The UI uses loading="lazy" and an onError fallback to a gradient, so a
// missing/invalid URL never leaves a card visually blank.

import { getCachedImage, getCachedCityImage, cacheImage, warmCacheFromMaps } from "@/lib/destinationImageCache";

const U = (id, w = 800) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

// City → [hero, ...activity/landmark images]. Keyed by lowercased city name.
const CITY_IMAGES = {
  paris: [U("1502602898657-3e91760c7342"), U("1499856871958-e536a85ced87"), U("1565060169187-5284f237c1e6")],
  venice: [U("1514890549352-f234c0e4712b"), U("1523906834658-6e24ef2386f9"), U("1504542176202-7c81e05e1c60")],
  lucerne: [U("1530841378377-8d8a90887b67"), U("1515488764276-beab7607c1e6"), U("1467139845747-cf4d1c4e3b4d")],
  london: [U("1533929736458-ca588d3e1b4b"), U("1513635269975-bb2c67d1c11a"), U("1574236523842-114e96b85b25")],
  amsterdam: [U("1534351590666-13e3e96c5017"), U("1559339352-1c4ad1c1c0c4"), U("1506938217490-9c1e9c1c1c1c")],
  berlin: [U("1560969184-10fe8719e047"), U("1558981806-ec5c4d1c4c1c"), U("1528736235300-1c1c1c1c1c1c")],
  bangalore: [U("1596178065887-3088e018ea01"), U("1605640840605-11acac5e9c1c"), U("1582541041950-1c1c1c1c1c1c")],
  rome: [U("1552832230-c0d7c1c1c1c1"), U("1531572753322-ad063cecc140"), U("1552832230-c0d7c1c1c1c1")],
  florence: [U("1543412422-3e9c1c1c1c1c"), U("1502810190503-1c1c1c1c1c1c"), U("1502810190503-1c1c1c1c1c1c")],
  zurich: [U("1515488764276-beab7607c1e6"), U("1530841378377-8d8a90887b67"), U("1467139845747-cf4d1c4e3b4d")],
  geneva: [U("1530841378377-8d8a90887b67"), U("1515488764276-beab7607c1e6"), U("1467139845747-cf4d1c4e3b4d")],
  "new york": [U("1496442226666-8d6d04c1c1c1"), U("1505739999588-1c1c1c1c1c1c"), U("1522083165190-1c1c1c1c1c1c")],
  dubai: [U("1512452081968-1c1c1c1c1c1c"), U("1518684079-3c1c1c1c1c1c"), U("1531592379825-1c1c1c1c1c1c")],
  tokyo: [U("1540959733332-eab4deabeeaf"), U("1503899036084-c55cdd92da26"), U("1554797589-924d2c1c1c1c")],
  barcelona: [U("1583422400-1c1c1c1c1c1c"), U("1506818178420-1c1c1c1c1c1c"), U("1539037118274-1c1c1c1c1c1c")],
};

// Generic experience/landmark keyword → image. Used for activity cards when a
// keyword in the activity title matches. Falls back to the destination hero.
const ACTIVITY_IMAGES = {
  eiffel: U("1502602898657-3e91760c7342"),
  louvre: U("1565060169187-5284f237c1e6"),
  seine: U("1499856871958-e536a85ced87"),
  canal: U("1514890549352-f234c0e4712b"),
  "st mark": U("1523906834658-6e24ef2386f9"),
  "st. mark": U("1523906834658-6e24ef2386f9"),
  burano: U("1504542176202-7c81e05e1c60"),
  museum: U("1574236523842-114e96b85b25"),
  "tower bridge": U("1533929736458-ca588d3e1b4b"),
  "big ben": U("1513635269975-bb2c67d1c11a"),
  westminster: U("1513635269975-bb2c67d1c11a"),
  bridge: U("1533929736458-ca588d3e1b4b"),
  alps: U("1530841378377-8d8a90887b67"),
  lake: U("1515488764276-beab7607c1e6"),
  mountain: U("1467139845747-cf4d1c4e3b4d"),
  train: U("1473042904451-00171c69419d"),
  rail: U("1473042904451-00171c69419d"),
  ferry: U("1505739999588-1c1c1c1c1c1c"),
  boat: U("1505739999588-1c1c1c1c1c1c"),
  market: U("1543248939-ff40856f65b4"),
  food: U("1504674900247-1c1c1c1c1c1c"),
  cafe: U("1554118814-1c1c1c1c1c1c"),
  walking: U("1469474968028-56623f02e42c"),
  bike: U("1502744678620-1c1c1c1c1c1c"),
  church: U("1523906834658-6e24ef2386f9"),
  cathedral: U("1523906834658-6e24ef2386f9"),
  garden: U("1467139845747-cf4d1c4e3b4d"),
  palace: U("1583422400-1c1c1c1c1c1c"),
  square: U("1552832230-c0d7c1c1c1c1"),
};

const FALLBACK_IMAGES = [
  U("1507525428034-b723cf961d3e"),
  U("1469854523086-cc02fe5d8800"),
  U("1476514525535-07d1c1c1c1c1c".replace("1c1c1c1c1c1c", "9fb4")),
];

const cityKey = (destinationFull) => {
  if (!destinationFull) return "";
  return String(destinationFull).split(",")[0].trim().toLowerCase();
};

// Warm the persistent cache from the static maps once on module load so known
// city/keyword combos are pre-cached and never need a runtime lookup.
warmCacheFromMaps(CITY_IMAGES, ACTIVITY_IMAGES);

export const getDestinationHero = (destinationFull) => {
  const key = cityKey(destinationFull);
  // 1. Check persistent cache for this destination
  const cached = getCachedCityImage(key);
  if (cached) return cached;
  // 2. Resolve from static map
  const pool = CITY_IMAGES[key];
  const url = pool && pool.length ? pool[0] : FALLBACK_IMAGES[0];
  // 3. Cache the result for future reuse
  cacheImage(url, key, "any", "static_map");
  return url;
};

// Pick an activity image by keyword match against the title; fall back to a
// rotating destination image so no card is ever blank.
// Lookup order: activity keyword → cache (destination+keyword) → cache
// (destination generic) → static destination pool → fallback. Results are
// cached so reopening a saved journey reuses the same image without re-lookup.
export const getActivityImage = (activityTitle, destinationFull, index = 0) => {
  const title = String(activityTitle || "").toLowerCase();
  const key = cityKey(destinationFull);

  // 1. Activity keyword match (also check cache first for this dest+keyword)
  for (const kw of Object.keys(ACTIVITY_IMAGES)) {
    if (title.includes(kw)) {
      const cached = getCachedImage(key, kw);
      if (cached) return cached;
      const url = ACTIVITY_IMAGES[kw];
      cacheImage(url, key, kw, "static_map");
      return url;
    }
  }

  // 2. Cache hit for destination generic image
  const cachedCity = getCachedCityImage(key);
  if (cachedCity) return cachedCity;

  // 3. Static destination pool (rotating index so days differ)
  const pool = CITY_IMAGES[key] || FALLBACK_IMAGES;
  const url = pool[index % pool.length];

  // 4. Cache and return — fallback order: activity → destination → fallback
  cacheImage(url, key, "any", "static_map");
  return url;
};

// Deterministically assign one image per day. Reuses the curated-trip pattern:
// no two consecutive days share the same image when the pool has >1 image.
export const assignDayImages = (numDays, destinationFull) => {
  if (!numDays || numDays <= 0) return [];
  const key = cityKey(destinationFull);
  const pool = (CITY_IMAGES[key] || FALLBACK_IMAGES).filter(Boolean);
  if (!pool.length) return Array(numDays).fill(FALLBACK_IMAGES[0]);
  if (pool.length === 1) return Array(numDays).fill(pool[0]);
  const result = new Array(numDays);
  let prev = -1;
  for (let i = 0; i < numDays; i++) {
    let idx = i % pool.length;
    if (idx === prev) idx = (idx + 1) % pool.length;
    result[i] = pool[idx];
    prev = idx;
  }
  return result;
};