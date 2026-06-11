const Sentry = require('@sentry/node');

/**
 * Initializes Sentry error tracking. Safe to call even without a DSN set —
 * it just becomes a no-op, so local dev without monitoring still works.
 * Required by the submission checklist: "API failures, Wallet failures,
 * Contract failures" must be tracked.
 */
function initMonitoring() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    // eslint-disable-next-line no-console
    console.warn('[sentry] SENTRY_DSN not set — monitoring disabled. Set it in .env for submission.');
    return false;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
  });

  return true;
}

/**
 * Tag and capture an error with a category so Sentry's issue grouping and
 * the dashboards you screenshot for submission clearly show failure types:
 * api | wallet | contract.
 */
function captureCategorizedError(error, category, extra = {}) {
  Sentry.withScope((scope) => {
    scope.setTag('failure_category', category);
    Object.entries(extra).forEach(([key, value]) => scope.setExtra(key, value));
    Sentry.captureException(error);
  });
}

module.exports = { initMonitoring, captureCategorizedError, Sentry };
