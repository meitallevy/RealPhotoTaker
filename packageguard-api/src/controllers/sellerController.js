const fs = require('fs');
const db = require('../config/database');
const { getClaimCounts } = require('../services/planService');

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:4000';

async function getDashboard (req, res, next) {
  try {
    const sellerId = req.user.sellerId;

    const sellerRes = await db.query(
      `SELECT s.id, s.seller_id, s.business_name, s.country, s.created_at, s.plan,
              s.plan_daily_limit, s.plan_monthly_limit, s.plan_total_limit,
              u.email, u.email_verified
       FROM sellers s
       JOIN users u ON u.id = s.user_id
       WHERE s.seller_id = $1`,
      [sellerId]
    );
    if (sellerRes.rowCount === 0) {
      const err = new Error('Seller not found');
      err.status = 404;
      throw err;
    }
    const seller = sellerRes.rows[0];

    const counts = await getClaimCounts(seller.id);

    res.json({
      seller: {
        sellerId: seller.seller_id,
        businessName: seller.business_name,
        email: seller.email,
        verified: seller.email_verified,
        createdAt: seller.created_at,
        plan: seller.plan || 'trial'
      },
      stats: {
        claimsToday:     counts.today,
        claimsThisWeek:  counts.thisWeek,
        claimsThisMonth: counts.thisMonth,
        claimsTotal:     counts.total,
        // Legacy field kept for backwards compatibility
        totalClaims:     counts.total
      },
      planLimits: {
        daily:   seller.plan_daily_limit,
        monthly: seller.plan_monthly_limit,
        total:   seller.plan_total_limit
      },
      qrCode: {
        dataUrl: null,
        deepLink: `packageguard://claim?seller=${sellerId}`
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getClaims (req, res, next) {
  try {
    const sellerId = req.user.sellerId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const params = [sellerId];
    let whereExtra = '';

    if (req.query.status) {
      params.push(req.query.status);
      whereExtra += ` AND c.status = $${params.length}`;
    }
    if (req.query.from) {
      params.push(req.query.from);
      whereExtra += ` AND c.created_at >= $${params.length}`;
    }
    if (req.query.to) {
      params.push(req.query.to);
      whereExtra += ` AND c.created_at <= $${params.length}`;
    }

    const countRes = await db.query(
      `SELECT COUNT(*) FROM claims c
       WHERE c.seller_id = (SELECT id FROM sellers WHERE seller_id = $1)${whereExtra}`,
      params
    );
    const total = Number(countRes.rows[0].count || 0);

    params.push(limit, offset);

    const claimsRes = await db.query(
      `SELECT c.claim_id, c.order_id, c.status, c.created_at,
              c.seller_decision, c.seller_viewed_at,
              (SELECT COUNT(*) FROM evidence_items e WHERE e.claim_id = c.id) AS evidence_count
       FROM claims c
       WHERE c.seller_id = (SELECT id FROM sellers WHERE seller_id = $1)${whereExtra}
       ORDER BY c.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      claims: claimsRes.rows.map(c => ({
        claimId: c.claim_id,
        orderId: c.order_id,
        status: c.status,
        evidenceCount: Number(c.evidence_count || 0),
        submittedAt: c.created_at,
        sellerDecision: c.seller_decision || null,
        sellerViewedAt: c.seller_viewed_at || null,
        verificationUrl: `${PUBLIC_BASE_URL}/v1/verify/${c.claim_id}`,
        thumbnailUrl: null
      })),
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getClaimDetail (req, res, next) {
  try {
    const sellerId = req.user.sellerId;
    const { claimId } = req.params;

    const claimRes = await db.query(
      `SELECT c.claim_id, c.order_id, c.status, c.created_at, c.buyer_notes,
              c.risk_factors, c.manifest_hash, c.signature, c.signed_at, c.pdf_url,
              c.seller_viewed_at, c.seller_decision, c.seller_note, c.seller_decided_at
       FROM claims c
       WHERE c.claim_id = $1
         AND c.seller_id = (SELECT id FROM sellers WHERE seller_id = $2)`,
      [claimId, sellerId]
    );
    if (claimRes.rowCount === 0) {
      const err = new Error('Claim not found');
      err.status = 404;
      throw err;
    }
    const claim = claimRes.rows[0];

    // Auto-mark as viewed on first open
    if (!claim.seller_viewed_at) {
      await db.query(
        'UPDATE claims SET seller_viewed_at = NOW() WHERE claim_id = $1',
        [claimId]
      );
      claim.seller_viewed_at = new Date().toISOString();
    }

    const evidenceRes = await db.query(
      `SELECT evidence_id, step_id, file_hash, captured_at, resolution, mime_type, file_path,
              ai_verdict, ai_confidence, ai_details
       FROM evidence_items
       WHERE claim_id = (SELECT id FROM claims WHERE claim_id = $1)
       ORDER BY sequence_number ASC`,
      [claimId]
    );

    res.json({
      claim: {
        claimId: claim.claim_id,
        orderId: claim.order_id,
        status: claim.status,
        submittedAt: claim.created_at,
        buyerNotes: claim.buyer_notes,
        sellerViewedAt: claim.seller_viewed_at,
        sellerDecision: claim.seller_decision,
        sellerNote: claim.seller_note,
        sellerDecidedAt: claim.seller_decided_at
      },
      evidence: evidenceRes.rows.map(e => ({
        evidenceId: e.evidence_id,
        stepId: e.step_id,
        hash: e.file_hash,
        capturedAt: e.captured_at,
        imageUrl: e.file_path
          ? `${PUBLIC_BASE_URL}/v1/seller/claims/${claimId}/evidence/${e.evidence_id}/image`
          : null,
        metadata: {
          resolution: e.resolution,
          mimeType: e.mime_type
        },
        aiAnalysis: e.ai_verdict ? {
          verdict:    e.ai_verdict,
          confidence: e.ai_confidence != null ? Number(e.ai_confidence) : null,
          details:    e.ai_details
        } : null
      })),
      verification: {
        manifestHash: claim.manifest_hash,
        signature: claim.signature,
        signedAt: claim.signed_at,
        signedBy: 'PackageGuard Evidence Service',
        publicKeyUrl: 'https://packageguard.io/.well-known/signing-key.pem'
      },
      pdfReportUrl: claim.pdf_url
    });
  } catch (err) {
    next(err);
  }
}

async function updateSettings (req, res, next) {
  try {
    const sellerId = req.user.sellerId;
    const { email, webhookUrl, notificationPreferences } = req.body;

    let emailUpdateRequired = false;

    if (email) {
      await db.query(
        `UPDATE users SET email = $1, email_verified = false, updated_at = NOW()
         WHERE id = (SELECT user_id FROM sellers WHERE seller_id = $2)`,
        [email, sellerId]
      );
      emailUpdateRequired = true;
    }

    const updates = [];
    const params = [sellerId];

    if (webhookUrl !== undefined) {
      params.push(webhookUrl);
      updates.push(`webhook_url = $${params.length}`);
    }
    if (notificationPreferences?.emailOnNewClaim !== undefined) {
      params.push(notificationPreferences.emailOnNewClaim);
      updates.push(`notification_email = $${params.length}`);
    }
    if (notificationPreferences?.webhookEnabled !== undefined) {
      params.push(notificationPreferences.webhookEnabled);
      updates.push(`notification_webhook = $${params.length}`);
    }

    if (updates.length > 0) {
      await db.query(
        `UPDATE sellers SET ${updates.join(', ')}, updated_at = NOW() WHERE seller_id = $1`,
        params
      );
    }

    res.json({ updated: true, verificationRequired: emailUpdateRequired });
  } catch (err) {
    next(err);
  }
}

async function getEvidenceImage (req, res, next) {
  try {
    const sellerId = req.user.sellerId;
    const { claimId, evidenceId } = req.params;

    // Verify claim belongs to this seller
    const claimCheck = await db.query(
      `SELECT c.id FROM claims c
       WHERE c.claim_id = $1
         AND c.seller_id = (SELECT id FROM sellers WHERE seller_id = $2)`,
      [claimId, sellerId]
    );
    if (claimCheck.rowCount === 0) {
      const err = new Error('Claim not found');
      err.status = 404;
      throw err;
    }

    const evidenceRes = await db.query(
      `SELECT file_path, mime_type FROM evidence_items WHERE evidence_id = $1`,
      [evidenceId]
    );
    if (evidenceRes.rowCount === 0) {
      const err = new Error('Evidence not found');
      err.status = 404;
      throw err;
    }

    const { file_path, mime_type } = evidenceRes.rows[0];
    if (!fs.existsSync(file_path)) {
      const err = new Error('File not found on disk');
      err.status = 404;
      throw err;
    }

    res.setHeader('Content-Type', mime_type || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    fs.createReadStream(file_path).pipe(res);
  } catch (err) {
    next(err);
  }
}

async function reviewClaim (req, res, next) {
  try {
    const sellerId = req.user.sellerId;
    const { claimId } = req.params;
    const { decision, note } = req.body;

    const validDecisions = ['APPROVED', 'REJECTED', 'MORE_INFO_REQUESTED'];
    if (!decision || !validDecisions.includes(decision)) {
      const err = new Error('Invalid decision. Must be APPROVED, REJECTED, or MORE_INFO_REQUESTED');
      err.status = 400;
      throw err;
    }

    // Verify claim belongs to this seller and fetch webhook URL
    const claimCheck = await db.query(
      `SELECT c.claim_id, c.order_id, s.webhook_url
       FROM claims c
       JOIN sellers s ON s.id = c.seller_id
       WHERE c.claim_id = $1
         AND c.seller_id = (SELECT id FROM sellers WHERE seller_id = $2)`,
      [claimId, sellerId]
    );
    if (claimCheck.rowCount === 0) {
      const err = new Error('Claim not found');
      err.status = 404;
      throw err;
    }
    const row = claimCheck.rows[0];

    const decidedAt = new Date().toISOString();
    await db.query(
      `UPDATE claims
       SET seller_decision = $1, seller_note = $2, seller_decided_at = NOW(),
           seller_viewed_at = COALESCE(seller_viewed_at, NOW())
       WHERE claim_id = $3`,
      [decision, note || null, claimId]
    );

    // Fire webhook fire-and-forget if MORE_INFO_REQUESTED and URL is configured
    if (decision === 'MORE_INFO_REQUESTED' && row.webhook_url) {
      const payload = JSON.stringify({
        event: 'SELLER_REVIEW',
        claimId: row.claim_id,
        orderId: row.order_id,
        decision,
        note: note || null,
        decidedAt
      });
      fetch(row.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        signal: AbortSignal.timeout(8000)
      }).catch(err => {
        // eslint-disable-next-line no-console
        console.warn(`Webhook to ${row.webhook_url} failed: ${err.message}`);
      });
    }

    res.json({ updated: true, decision, note: note || null, decidedAt });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboard,
  getClaims,
  getClaimDetail,
  getEvidenceImage,
  updateSettings,
  reviewClaim
};
