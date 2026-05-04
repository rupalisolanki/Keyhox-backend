// Entry point for the Keyhox backend server. Starts the HTTP server on the specified port.

require('dotenv').config();

const app = require('./src/app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Keyhox server running on port ${PORT}`);
});