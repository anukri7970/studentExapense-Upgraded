const { captureCategorizedError } = require('../config/monitoring');

/**
 * Centralized error handler. Routes call next(err) with an Error that may
 * carry a `.category` ('api' | 'wallet' | 'contract') and `.statusCode`.
 * Falls back to 'api' and 500 if not specified, so nothing escapes
 * uncategorized into Sentry.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const category = err.category || 'api';
  const statusCode = err.statusCode || 500;

  captureCategorizedError(err, category, {
    path: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
  });

  // eslint-disable-next-line no-console
  console.error(`[${category}] ${req.method} ${req.originalUrl} ->`, err.message);

  res.status(statusCode).json({
    error: err.publicMessage || 'Something went wrong. Please try again.',
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFoundHandler };
