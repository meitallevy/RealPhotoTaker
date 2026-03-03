const crypto = require('crypto');

const db = require('../config/database');
const { signManifestHash } = require('../services/signingService');
const { generateClaimPdf } = require('../services/pdfService');
const { sendEmail, claimCompletedHtml } = require('../services/emailService');
const { sendClaimCompletedWebhook } = require('../services/webhookService');
const { analyzeImage } = require('../services/imageAnalysisService');

/**
 * Evidence-processing pipeline.
 * Triggered after all evidence uploads are complete.
 */

async function processClaim (claimId) {
  const claimRes = await db.query(
    `SELECT c.*, s.seller_id, s.webhook_url, s.webhook_secret, s.business_name,
            u.email AS seller_email
     FROM claims c
     JOIN sellers s ON s.id = c.seller_id
     JOIN users   u ON u.id = s.user_id
     WHERE c.claim_id = $1`,
    [claimId]
  );
  if (claimRes.rowCount === 0) {
    throw new Error('Claim not found');
  }
  const claim = claimRes.rows[0];

  // Include file_path + mime_type so AI analysis can read the file
  const evidenceRes = await db.query(
    `SELECT evidence_id, step_id, captured_at, file_hash, file_path, mime_type
     FROM evidence_items
     WHERE claim_id = $1
     ORDER BY sequence_number ASC`,
    [claim.id]
  );
  const evidenceItems = evidenceRes.rows;

  // ── Optional AI image analysis (non-fatal) ──────────────────────────────
  const aiResults = {};
  for (const item of evidenceItems) {
    try {
      const result = await analyzeImage(item.file_path, item.mime_type);
      if (result) {
        aiResults[item.evidence_id] = result;
        await db.query(
          `UPDATE evidence_items
           SET ai_verdict = $1, ai_confidence = $2, ai_details = $3, ai_analyzed_at = NOW()
           WHERE evidence_id = $4`,
          [result.verdict, result.confidence, result.details, item.evidence_id]
        );
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[processClaimWorker] AI analysis skipped for ${item.evidence_id}:`, err.message);
    }
  }

  // ── Build manifest (AI verdicts included so tampering invalidates sig) ──
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
      capturedAt: e.captured_at?.toISOString?.() || e.captured_at,
      aiVerdict: aiResults[e.evidence_id]?.verdict || null
    })),
    device: claim.device_info,
    attestation: claim.attestation_result
  };

  const manifestJson = JSON.stringify(manifest, Object.keys(manifest).sort());
  const manifestHash = crypto.createHash('sha256').update(manifestJson).digest('hex');
  const signature = await signManifestHash(manifestHash);

  const verificationUrl = `${process.env.PUBLIC_BASE_URL || 'http://localhost:4000'}/v1/verify/${claimId}`;
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

  // ── Email seller notification ───────────────────────────────────────────
  const notificationEmail = claim.notification_email || claim.seller_email;
  if (notificationEmail) {
    await sendEmail(
      notificationEmail,
      `PackageGuard: Claim ${claimId} verified`,
      claimCompletedHtml(claimId, verificationUrl)
    );
  }

  // ── Webhook notification ────────────────────────────────────────────────
  await sendClaimCompletedWebhook(claim, claim);
}

module.exports = {
  processClaim
};
