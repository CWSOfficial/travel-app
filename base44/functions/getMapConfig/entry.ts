import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import { secrets } from "base44:runtime";

// Returns the Mapbox public access token for client-side tile rendering in
// JourneyMap. The token is a public Mapbox token (designed to be embedded in
// browser tile URLs) but is kept out of the client source bundle to prevent
// casual scraping and allow central rotation.
//
// SECURITY: createClientFromRequest validates the Base44 platform auth token
// that the SDK injects — this blocks direct curl / external calls that lack
// a valid app session while still allowing guest (no-login) visitors to use
// the map. No auth.me() login is required (public app).
// If the secret is unset, returns { mapboxToken: null } so the frontend can
// show its controlled fallback UI instead of broken provider tiles.
export default async function (req: Request): Promise<Response> {
  try {
    // Platform-token gate — validates the request came through the Base44 app
    createClientFromRequest(req);

    const mapboxToken = secrets.get("MAPBOX_ACCESS_TOKEN") || null;
    return Response.json({ mapboxToken });
  } catch (error: any) {
    if (error?.message?.includes("Unauthorized") || error?.message?.includes("unauthorized")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ mapboxToken: null, error: error?.message || "internal_error" }, { status: 500 });
  }
}