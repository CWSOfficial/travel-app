// Unsplash photo URLs for the Popular Destinations section.
// Uses confirmed-working travel photos (same set as DestinationCard).
// Photos are rotated by index so adjacent cards get different images.

const PHOTOS = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80", // Beach
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80", // Mountain road
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80", // Lake
  "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80", // Tokyo (confirmed working in preview)
];

export function getDestinationPhoto(countryCode, index = 0) {
  return PHOTOS[index % PHOTOS.length];
}