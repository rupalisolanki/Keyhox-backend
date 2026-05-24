const orderSuccessEmail = (/** @type {any} */ { name, email, productName, licenseKey, orderId, amount }) => ({
  from: process.env.FROM_EMAIL ?? 'noreply@keyhox.com',
  to: email,
  subject: `Your ${productName} License Key - Order #${orderId}`,
  html: `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #1a1a2e; padding: 30px; text-align: center;">
    <h1 style="color: #e94560; margin: 0;">Keyhox</h1>
    <p style="color: #fff; margin: 5px 0;">Digital Software Store</p>
  </div>
  <div style="padding: 30px; background: #f9f9f9;">
    <h2>Thank you, ${name}! 🎉</h2>
    <p>Your purchase was successful. Here are your order details:</p>
    <div style="background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Product:</strong> ${productName}</p>
      <p><strong>Amount Paid:</strong> $${amount}</p>
    </div>
    <div style="background: #1a1a2e; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
      <p style="color: #aaa; margin: 0 0 10px;">Your License Key</p>
      <h2 style="color: #e94560; letter-spacing: 3px; margin: 0;">${licenseKey}</h2>
    </div>
    <p style="color: #666; font-size: 14px;">Keep this key safe. It can only be used once. If you have any issues, contact our support team.</p>
  </div>
  <div style="background: #1a1a2e; padding: 20px; text-align: center;">
    <p style="color: #666; font-size: 12px; margin: 0;">© 2025 Keyhox. All rights reserved.</p>
  </div>
</body>
</html>`
});

const supportTicketEmail = (/** @type {any} */ { name, email, subject, ticketId }) => ({
  from: process.env.FROM_EMAIL ?? 'noreply@keyhox.com',
  to: email,
  subject: `Support Ticket #${ticketId} Received - Keyhox`,
  html: `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #1a1a2e; padding: 30px; text-align: center;">
    <h1 style="color: #e94560; margin: 0;">Keyhox</h1>
    <p style="color: #fff; margin: 5px 0;">Support Center</p>
  </div>
  <div style="padding: 30px; background: #f9f9f9;">
    <h2>Hi ${name},</h2>
    <p>We've received your support ticket and will get back to you shortly.</p>
    <div style="background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Ticket ID:</strong> #${ticketId}</p>
      <p><strong>Subject:</strong> ${subject}</p>
    </div>
    <p style="color: #666; font-size: 14px;">Our team typically responds within 24 hours.</p>
  </div>
  <div style="background: #1a1a2e; padding: 20px; text-align: center;">
    <p style="color: #666; font-size: 12px; margin: 0;">© 2025 Keyhox. All rights reserved.</p>
  </div>
</body>
</html>`
});

module.exports = { orderSuccessEmail, supportTicketEmail };
