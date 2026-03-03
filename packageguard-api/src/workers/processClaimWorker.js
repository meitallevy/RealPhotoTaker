const crypto = require('crypto');

const db = require('../config/database');
const { signManifestHash } = require('../services/signingService');
const { generateClaimPdf } = require('../services/pdfService');
const { sendEmail } = require('../services/emailService');
const { sendClaimCompletedWebhook } = require('../services/webhookService');

/**
 * This worker represents the evidence-processing pipeline described in the spec.
 * It is designed to be triggered by a queue or manually for now.
 */

async function processClaim (claimId) {
  const claimRes = await db.query(
    `SELECT c.*, s.seller_id, s.webhook_url, s.webhook_secret
     FROM claims c
     JOIN sellers s ON s.id = c.seller_id
     WHERE c.claim_id = $1`,
    [claimId]
  );
  if (claimRes.rowCount === 0) {
    throw new Error('Claim not found');
  }
  const claim = claimRes.rows[0];

  const evidenceRes = await db.query(
    `SELECT evidence_id, step_id, captured_at, file_hash
     FROM evidence_items
     WHERE claim_id = $1
     ORDER BY sequence_number ASC`,
    [claim.id]
  );
  const evidenceItems = evidenceRes.rows;

  const manifest = {
    version: '1.0',
    claimId: claim.claim_id,
    sellerId: claim.seller_id,
    orderId: claim.order_id,
    nonce: claim.nonce,
    capturedAt: claim.created_at?.toISOString?.() || claim.created_at,
    processedAt: new Date().toISOString(),
    evidence: evidenceItems.map(e => ({
      evidenceId: e.evidence_id,
      stepId: e.step_id,
      hash: e.file_hash,
      capturedAt: e.captured_at?.toISOString?.() || e.captured_at
    })),
    device: claim.device_info,
    attestation: claim.attestation_result
  };

  const manifestJson = JSON.stringify(manifest, Object.keys(manifest).sort());
  const manifestHash = crypto.createHash('sha256').update(manifestJson).digest('hex');
  const signature = await signManifestHash(manifestHash);

  const pdfUrl = await generateClaimPdf(claim, evidenceItems);

  await db.query(
    `UPDATE claims
     SET manifest_hash = $1,
         signature = $2,
         signed_at = NOW(),
         pdf_url = $3,
         status = 'COMPLETED'
     WHERE claim_id = $4`,
    [`sha256:${manifestHash}`, signature, pdfUrl, claimId]
  );

  // Send email and webhook notifications (stub).
  await sendEmail(
    claim.notification_email || 'seller@example.com',
    `PackageGuard claim ${claim.claim_id} completed`,
    `Your claim ${claim.claim_id} has been processed.`
  );
  await sendClaimCompletedWebhook(claim, claim);
}

module.exports = {
  processClaim
};

