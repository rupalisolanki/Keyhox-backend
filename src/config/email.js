const { Resend } = require('resend');

let /** @type {any} */ resend;

module.exports = {
  getResend() {
    if (!resend) {
      if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');
      resend = new Resend(process.env.RESEND_API_KEY);
    }
    return resend;
  }
};
