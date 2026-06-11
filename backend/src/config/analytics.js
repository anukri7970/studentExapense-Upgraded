const { PostHog } = require('posthog-node');

let client = null;

/**
 * Initializes the PostHog server-side client. Like monitoring, this is a
 * safe no-op if POSTHOG_API_KEY isn't set, so local dev doesn't break.
 */
function initAnalytics() {
  const apiKey = process.env.POSTHOG_API_KEY;
  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.warn('[posthog] POSTHOG_API_KEY not set — analytics disabled. Set it in .env for submission.');
    return false;
  }

  client = new PostHog(apiKey, {
    host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
  });

  return true;
}

/**
 * Tracks one of the five required events from the submission checklist:
 * wallet_connected, funds_sent, expense_added, tuition_paid, ai_analysis_run.
 */
function track(distinctId, event, properties = {}) {
  if (!client) return;
  client.capture({ distinctId, event, properties });
}

async function shutdownAnalytics() {
  if (client) {
    await client.shutdown();
  }
}

module.exports = { initAnalytics, track, shutdownAnalytics };
