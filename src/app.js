// Express app setup for Keyhox API. Initializes Express, adds middleware, and sets up a health check route.

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Payment routes BEFORE express.json() — webhook needs raw body
const paymentRoutes = require('./routes/payment.routes');
app.use('/api', paymentRoutes);

app.use(express.json());
app.use(cookieParser());
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
const paypalRoutes = require('./routes/paypal.routes');
app.use('/api', paypalRoutes);

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