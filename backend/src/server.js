require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { connectDatabase } = require('./config/database');
const { initMonitoring, Sentry } = require('./config/monitoring');
const { initAnalytics } = require('./config/analytics');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const transactionRoutes = require('./routes/transactions');
const expenseRoutes = require('./routes/expenses');
const aiRoutes = require('./routes/ai');
const feedbackRoutes = require('./routes/feedback');

const monitoringEnabled = initMonitoring();
initAnalytics();

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Basic abuse protection on auth endpoints specifically.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
app.use('/api/auth', authLimiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.1.0', monitoring: monitoringEnabled, timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/feedback', feedbackRoutes);

app.use(notFoundHandler);

if (monitoringEnabled && Sentry.expressErrorHandler) {
  app.use(Sentry.expressErrorHandler());
}
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

async function start() {
  await connectDatabase();
  // eslint-disable-next-line no-console
  console.log('[mongo] connected');

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[startup] failed to start server:', err);
  process.exit(1);
});

module.exports = app;
