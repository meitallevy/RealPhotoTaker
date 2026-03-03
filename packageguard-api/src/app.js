require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const { errorHandler } = require('./middleware/errorHandler');
const rateLimitMiddleware = require('./middleware/rateLimit');

const authRoutes = require('./routes/authRoutes');
const configRoutes = require('./routes/configRoutes');
const claimRoutes = require('./routes/claimRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const verifyRoutes = require('./routes/verifyRoutes');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: '*'
  })
);
app.use(express.json({ limit: '10mb' }));

app.use(rateLimitMiddleware);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/v1/auth', authRoutes);
app.use('/v1/config', configRoutes);
app.use('/v1/claims', claimRoutes);
app.use('/v1/seller', sellerRoutes);
app.use('/v1/verify', verifyRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`PackageGuard API listening on port ${PORT}`);
});

module.exports = app;

