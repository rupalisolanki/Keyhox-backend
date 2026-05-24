const paypal = require('@paypal/checkout-server-sdk');

function getPayPalClient() {
  const clientId = /** @type {any} */ (process.env.PAYPAL_CLIENT_ID);
  const clientSecret = /** @type {any} */ (process.env.PAYPAL_CLIENT_SECRET);
  const environment =
    process.env.PAYPAL_MODE === 'live'
      ? new paypal.core.LiveEnvironment(clientId, clientSecret)
      : new paypal.core.SandboxEnvironment(clientId, clientSecret);
  return new paypal.core.PayPalHttpClient(environment);
}

module.exports = getPayPalClient;
