// Express app setup for Keyhox API. Initializes Express, adds middleware, and sets up a health check route.

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const app = express();

app.use(express.json());
app.use(cors());
app.use(morgan('combined'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: "OK", message: "Keyhox API is live" });
});

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const keyRoutes = require('./routes/key.routes');
const orderRoutes = require('./routes/order.routes');
const supportRoutes = require('./routes/support.routes');
app.use('/api', authRoutes);
app.use('/api', productRoutes);
app.use('/api', keyRoutes);
app.use('/api', orderRoutes);
app.use('/api', supportRoutes);

// Global error handler
// @ts-ignore
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

module.exports = app;