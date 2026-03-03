/**
 * Email sending service.
 * In production, integrate with SES / SendGrid.
 */

async function sendEmail (to, subject, html) {
  // TODO: wire to real provider.
  // eslint-disable-next-line no-console
  console.log('Sending email (stub)', { to, subject, preview: html?.slice(0, 80) });
}

module.exports = {
  sendEmail
};

