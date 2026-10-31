// Shared AI itinerary generation logic — reused by the Confirmation page.
// Extracted from the same prompt/schema used by Itinerary.jsx so both
// surfaces produce identical-quality day-by-day plans.

export const buildItineraryPrompt = (trip) => `You are Dbuddy AI, an expert AI travel companion. Create a day-by-day travel itinerary for this trip:

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

export const ITINERARY_RESPONSE_SCHEMA = {
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