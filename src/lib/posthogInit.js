import posthog from 'posthog-js';

// Initialize the posthog-js singleton once at app startup.
// Imported by src/main.jsx so it runs before any component mounts.
// This replaces the index.html snippet so there is a SINGLE PostHog
// instance shared by autocapture and every posthog.capture() call.
posthog.init('phc_qfdjG5YygW9QovnjCuABP64CtjBMB2gE6KLENbEV89ZP', {
  api_host: 'https://eu.i.posthog.com',
  autocapture: true,
  person_profiles: 'identified_only',
  flush_at: 1,            // flush every capture immediately (no batch delay)
  flush_interval_ms: 1000,
});

export default posthog;