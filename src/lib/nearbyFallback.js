// Client-side curated fallback for the Nearby tab. Mirrors the backend's
// buildFallbackPlaces so the UI can render rich cards even if the function
// invoke itself fails (network/infra). Honest Google Maps discovery links —
// never fabricated ratings or addresses.
export function buildFallbackPlaces(destination, category) {
  if (!destination) return [];
  const maps = (label) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${label} in ${destination}`)}`;
  const presets = {
    things_to_do: [
      { name: "Top Attractions", tag: "Attractions" },
      { name: "Guided Tours", tag: "Tours" },
      { name: "Outdoor Activities", tag: "Outdoor" },
      { name: "Museums & Culture", tag: "Culture" },
    ],
    places: [
      { name: "Landmarks", tag: "Landmarks" },
      { name: "Parks & Gardens", tag: "Parks" },
      { name: "Viewpoints", tag: "Viewpoints" },
      { name: "Historic Sites", tag: "Historic" },
    ],
    food: [
      { name: "Top Restaurants", tag: "Dining" },
      { name: "Cafés & Coffee", tag: "Cafés" },
      { name: "Local Cuisine", tag: "Local" },
      { name: "Street Food", tag: "Street Food" },
    ],
    lodging: [
      { name: "Hotels", tag: "Hotels" },
      { name: "Boutique Stays", tag: "Boutique" },
      { name: "Budget Stays", tag: "Budget" },
      { name: "Resorts", tag: "Resorts" },
    ],
  };
  const list = presets[category] || presets.places;
  return list.map((p) => ({
    name: `${p.name} in ${destination}`,
    rating: null,
    reviewCount: null,
    categoryTag: p.tag,
    address: null,
    photoUrl: null,
    mapsUrl: maps(p.name),
    fallback: true,
  }));
}