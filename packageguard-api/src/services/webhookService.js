const crypto = require('crypto');
const https = require('https');

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
      riskScore: claim.risk_score || 0,
      verificationUrl: `https://verify.packageguard.io/${claim.claim_id}`,
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

