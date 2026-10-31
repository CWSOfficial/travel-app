import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Email-only alert function. SMS is NOT implemented — do not claim otherwise.
// Trip save/confirm notifications are handled by the saveTrip function directly.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { type, trip } = body;

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const email = user.email;

    if (!email) {
      return Response.json({ error: 'No email on account' }, { status: 400 });
    }

    if (type === 'search_started') {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        from_name: "DheeVoy by Dbuddy",
        subject: "🔍 Your trip search has started!",
        body: `Hi there,

Great news — Dbuddy AI is now searching for your perfect trip!

📍 Departing from: ${trip.departure_city}
📅 Travel dates: ${trip.start_date} (${trip.duration_days} days)
💰 Budget: ${trip.budget?.replace("_", " ")}
✈️ Style: ${trip.travel_style}

We're analysing safety scores, visa requirements, live pricing and the best destinations for your profile. Your personalised recommendations will be ready in just a moment.

Safe travels,
The DheeVoy Team 🌍`
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});