const db = require('../config/database');

async function publicVerify (req, res, next) {
  try {
    const claimId = req.params.claimId;

    const claimRes = await db.query(
      `SELECT c.claim_id, c.order_id, s.seller_id, c.created_at,
              c.manifest_hash, c.signature, c.signed_at, c.risk_score,
              c.attestation_result,
              (SELECT COUNT(*) FROM evidence_items e WHERE e.claim_id = c.id) AS evidence_count
       FROM claims c
       JOIN sellers s ON s.id = c.seller_id
       WHERE c.claim_id = $1`,
      [claimId]
    );

    if (claimRes.rowCount === 0) {
      const err = new Error('Claim not found');
      err.status = 404;
      throw err;
    }
    const claim = claimRes.rows[0];

    const maskedOrderId = claim.order_id
      ? `${claim.order_id.slice(0, 3)}****${claim.order_id.slice(-4)}`
      : null;

    res.json({
      valid: true,
      claim: {
        claimId: claim.claim_id,
        orderId: maskedOrderId,
        sellerId: claim.seller_id,
        submittedAt: claim.created_at,
        evidenceCount: Number(claim.evidence_count || 0)
      },
      verification: {
        manifestHash: claim.manifest_hash,
        signatureValid: !!(claim.manifest_hash && claim.signature),
        signedBy: 'PackageGuard Evidence Service',
        signedAt: claim.signed_at
      },
      attestation: claim.attestation_result || {},
      evidenceThumbnails: []
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  publicVerify
};
