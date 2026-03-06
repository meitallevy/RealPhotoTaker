/**
 * webhookService.js
 *
 * Delivers signed webhook notifications to seller-configured URLs when a claim is completed.
 * Each request is signed with HMAC-SHA256 (using the seller's webhook_secret) so recipients
 * can verify the payload is genuine without exposing the secret over the wire.
 *
 * Main exports:
 *   sendClaimCompletedWebhook(seller, claim)
 *     – POSTs a 'claim.completed' event to seller.webhook_url when configured.
 *       No-ops silently when webhook_url or webhook_secret are absent.
 *
 * Signature format (X-PackageGuard-Signature header):
 *   t={unix_timestamp},sha256={hex_hmac_of_"timestamp.body"}
 */

const crypto = require('crypto');
const https = require('https');

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:4000';

function signPayload (secret, payload, timestamp) {
  const body = JSON.stringify(payload);
  const toSign = `${timestamp}.${body}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(toSign);
  return `t=${timestamp},sha256=${hmac.digest('hex')}`;
}

async function postJson (url, body, headers) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const urlObj = new URL(url);
    const options = {
      method: 'POST',
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      port: urlObj.port || 443,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => resolve(res.statusCode));
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function sendClaimCompletedWebhook (seller, claim) {
  if (!seller.webhook_url || !seller.webhook_secret) return;

  const payload = {
    event: 'claim.completed',
    timestamp: new Date().toISOString(),
    data: {
      claimId: claim.claim_id,
      orderId: claim.order_id,
      evidenceCount: claim.evidence_count || 0,
      verificationUrl: `${PUBLIC_BASE_URL}/v1/verify/${claim.claim_id}`,
      pdfReportUrl: claim.pdf_url
    }
  };

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signPayload(seller.webhook_secret, payload, timestamp);

  await postJson(seller.webhook_url, payload, {
    'X-PackageGuard-Signature': signature,
    'X-PackageGuard-Event': 'claim.completed'
  });
}

module.exports = {
  sendClaimCompletedWebhook
};

