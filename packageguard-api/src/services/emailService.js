/**
 * emailService.js
 *
 * Sends transactional HTML emails via SendGrid.
 * When SENDGRID_API_KEY is absent the functions print to the console instead of
 * sending, so the app works in development without any email configuration.
 *
 * Main exports:
 *   sendEmail(to, subject, html)              – low-level send; use the helpers below
 *   claimCompletedHtml(claimId, verifyUrl)    – blue-branded email to seller: claim signed & ready
 *   moreInfoRequestedHtml(claimId, note, seller) – orange email to buyer: seller needs more info
 *   newClaimReceivedHtml(claimId, orderId, count, verifyUrl) – new claim notification to seller
 *
 * Env vars:
 *   SENDGRID_API_KEY  – required to actually send (omit to use console stub)
 *   EMAIL_FROM        – sender address (default: noreply@packageguard.io)
 *   EMAIL_FROM_NAME   – sender display name (default: PackageGuard)
 */

let sgMail = null;
if (process.env.SENDGRID_API_KEY) {
  try {
    sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  } catch (_) {
    // eslint-disable-next-line no-console
    console.warn('[email] @sendgrid/mail not installed — run: npm install @sendgrid/mail');
  }
}

const FROM = {
  email: process.env.EMAIL_FROM      || 'noreply@packageguard.io',
  name:  process.env.EMAIL_FROM_NAME || 'PackageGuard'
};

/* ── core send ──────────────────────────────────────────────────────────── */

async function sendEmail (to, subject, html) {
  if (!sgMail) {
    // eslint-disable-next-line no-console
    console.log('[email stub]', { to, subject, preview: html?.slice(0, 120) });
    return;
  }
  await sgMail.send({ to, from: FROM, subject, html });
}

/* ── shared layout helper ───────────────────────────────────────────────── */

function _wrap (accentColor, title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    body{margin:0;padding:0;background:#F4F6F9;font-family:'Helvetica Neue',Arial,sans-serif;color:#1A1A2E}
    .outer{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .hdr{background:${accentColor};padding:28px 32px}
    .hdr h1{margin:0;color:#fff;font-size:20px;font-weight:700}
    .hdr p{margin:4px 0 0;color:rgba(255,255,255,.8);font-size:13px}
    .body{padding:28px 32px}
    .body p{margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151}
    .note-box{background:#FFF3E0;border-left:4px solid #E65100;padding:12px 16px;border-radius:6px;font-style:italic;color:#546E7A;margin:16px 0}
    .btn{display:inline-block;background:${accentColor};color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;margin:8px 0}
    .mono{font-family:monospace;background:#F4F6F9;padding:2px 6px;border-radius:4px;font-size:13px}
    .footer{padding:18px 32px;border-top:1px solid #E5E7EB;font-size:12px;color:#9CA3AF;text-align:center}
    .footer a{color:#1565C0}
  </style>
</head>
<body>
<div class="outer">
  <div class="hdr">
    <h1>&#127757; PackageGuard</h1>
    <p>${title}</p>
  </div>
  <div class="body">${bodyHtml}</div>
  <div class="footer">PackageGuard Evidence System &nbsp;&middot;&nbsp; <a href="https://packageguard.io">packageguard.io</a></div>
</div>
</body>
</html>`;
}

/* ── email templates ────────────────────────────────────────────────────── */

/** Notify a seller that a claim has been fully processed and signed. */
function claimCompletedHtml (claimId, verificationUrl) {
  return _wrap(
    '#1565C0',
    'Claim Verified &amp; Ready',
    `<p>A claim has been processed and cryptographically signed.</p>
     <p><strong>Claim ID:</strong> <span class="mono">${claimId}</span></p>
     <p>View the full evidence report, photos, and verification details:</p>
     <a class="btn" href="${verificationUrl}">View Verification Report</a>
     <p style="margin-top:20px;font-size:13px;color:#6B7280">
       This report includes a manifest hash and RSA-SHA256 signature confirming
       the evidence has not been altered since submission.
     </p>`
  );
}

/** Notify a buyer that the seller has requested more information. */
function moreInfoRequestedHtml (claimId, sellerNote, sellerName) {
  const noteBlock = sellerNote
    ? `<div class="note-box">&#x201C;${sellerNote}&#x201D;</div>`
    : '';
  return _wrap(
    '#E65100',
    'Additional Information Requested',
    `<p>The seller <strong>${sellerName || 'your seller'}</strong> has reviewed your claim
     <span class="mono">${claimId}</span> and is requesting additional information or photos.</p>
     ${noteBlock}
     <p>Open the PackageGuard app, enter your Seller ID and Order reference again,
     and follow the prompts to add the requested information.</p>`
  );
}

/** Notify a seller that a new claim has been submitted. */
function newClaimReceivedHtml (claimId, orderId, evidenceCount, verificationUrl) {
  return _wrap(
    '#1565C0',
    'New Claim Submitted',
    `<p>A buyer has submitted a new evidence claim for one of your orders.</p>
     <table style="width:100%;border-collapse:collapse;margin:16px 0">
       <tr><td style="padding:8px 0;color:#6B7280;font-size:13px;width:130px">Claim ID</td>
           <td><span class="mono">${claimId}</span></td></tr>
       <tr><td style="padding:8px 0;color:#6B7280;font-size:13px">Order</td>
           <td><span class="mono">${orderId}</span></td></tr>
       <tr><td style="padding:8px 0;color:#6B7280;font-size:13px">Photos</td>
           <td>${evidenceCount}</td></tr>
     </table>
     <a class="btn" href="${verificationUrl}">Review Evidence</a>`
  );
}

module.exports = {
  sendEmail,
  claimCompletedHtml,
  moreInfoRequestedHtml,
  newClaimReceivedHtml
};
