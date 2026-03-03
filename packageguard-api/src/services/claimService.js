const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

async function initiateClaim (payload) {
  const { sellerId, orderId, deviceInfo, attestationToken } = payload;

  const sellerRes = await db.query(
    'SELECT id FROM sellers WHERE seller_id = $1',
    [sellerId]
  );
  if (sellerRes.rowCount === 0) {
    const err = new Error('Unknown seller');
    err.status = 400;
    throw err;
  }
  const seller = sellerRes.rows[0];

  // ── Check for an existing claim awaiting more info from this buyer ───────
  const moreInfoRes = await db.query(
    `SELECT id, claim_id, seller_note FROM claims
     WHERE order_id = $1
       AND seller_id = $2
       AND seller_decision = 'MORE_INFO_REQUESTED'
     ORDER BY created_at DESC LIMIT 1`,
    [orderId, seller.id]
  );

  const nonce = String(Math.floor(100000 + Math.random() * 900000));
  const now = new Date();
  const expires = new Date(now.getTime() + 5 * 60 * 1000);

  if (moreInfoRes.rowCount > 0) {
    const existing = moreInfoRes.rows[0];
    // Reopen the claim: fresh nonce, reset status, clear seller decision
    await db.query(
      `UPDATE claims
       SET status = 'PENDING',
           nonce = $1,
           nonce_expires_at = $2,
           seller_decision = NULL,
           seller_decided_at = NULL
       WHERE id = $3`,
      [nonce, expires.toISOString(), existing.id]
    );
    await db.query(
      `INSERT INTO nonces (nonce, claim_id, expires_at, used) VALUES ($1,$2,$3,false)`,
      [nonce, existing.id, expires.toISOString()]
    );
    return {
      claimId: existing.claim_id,
      nonce,
      nonceExpiresAt: expires.toISOString(),
      serverTime: now.toISOString(),
      moreInfoRequested: true,
      sellerNote: existing.seller_note || null,
      captureConfig: {},
      uploadEndpoint: `/v1/claims/${existing.claim_id}/evidence`,
      uploadConfig: { chunkSizeBytes: 1048576, maxConcurrentUploads: 3, resumable: true }
    };
  }

  // ── Normal new-claim flow ─────────────────────────────────────────────────
  const claimPublicId = `clm_${uuidv4().replace(/-/g, '').slice(0, 8)}`;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const claimRes = await client.query(
      `INSERT INTO claims (
        claim_id, seller_id, order_id, nonce, nonce_expires_at,
        status, device_info, attestation_token, created_at
      ) VALUES ($1,$2,$3,$4,$5,'PENDING',$6,$7,$8)
      RETURNING id, claim_id, nonce, nonce_expires_at, created_at`,
      [
        claimPublicId,
        seller.id,
        orderId,
        nonce,
        expires.toISOString(),
        deviceInfo || {},
        attestationToken || null,
        now.toISOString()
      ]
    );
    const claim = claimRes.rows[0];

    await client.query(
      `INSERT INTO nonces (nonce, claim_id, expires_at, used) VALUES ($1,$2,$3,false)`,
      [nonce, claim.id, expires.toISOString()]
    );

    await client.query('COMMIT');

    return {
      claimId: claim.claim_id,
      nonce: claim.nonce,
      nonceExpiresAt: claim.nonce_expires_at,
      serverTime: now.toISOString(),
      moreInfoRequested: false,
      sellerNote: null,
      captureConfig: {},
      uploadEndpoint: '/v1/claims/' + claim.claim_id + '/evidence',
      uploadConfig: { chunkSizeBytes: 1048576, maxConcurrentUploads: 3, resumable: true }
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getStatus (claimId) {
  const res = await db.query(
    `SELECT claim_id, status, manifest_hash, signed_at, pdf_url,
            seller_decision, seller_note
     FROM claims WHERE claim_id = $1`,
    [claimId]
  );
  if (res.rowCount === 0) {
    const err = new Error('Claim not found');
    err.status = 404;
    throw err;
  }
  const claim = res.rows[0];

  return {
    claimId: claim.claim_id,
    status: claim.status,
    sellerDecision: claim.seller_decision,
    sellerNote: claim.seller_note,
    result: claim.status === 'COMPLETED'
      ? {
          valid: true,
          evidenceCount: null,
          manifestHash: claim.manifest_hash,
          signedAt: claim.signed_at,
          verificationUrl: `${process.env.PUBLIC_BASE_URL || 'http://localhost:4000'}/v1/verify/${claim.claim_id}`,
          pdfReportUrl: claim.pdf_url,
          sellerNotified: true,
          attestationVerdict: null
        }
      : null
  };
}

module.exports = {
  initiateClaim,
  getStatus
};
