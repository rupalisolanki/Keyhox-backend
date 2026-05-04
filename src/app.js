// Express app setup for Keyhox API. Initializes Express, adds middleware, and sets up a health check route.

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

app.use(express.json());
app.use(cors());
app.use(morgan('combined'));

app.get('/api/health', (req, res) => {
  res.json({ status: "OK", message: "Keyhox API is live" });
});

module.exports = app;