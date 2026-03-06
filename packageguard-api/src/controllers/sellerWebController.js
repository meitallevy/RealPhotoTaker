/**
 * sellerWebController.js
 *
 * Web UI controllers for seller dashboard — renders HTML pages instead of JSON.
 * All endpoints require authentication via JWT token (passed as query param ?token=... or cookie).
 *
 * Main exports:
 *   dashboard(req, res, next)    – renders seller dashboard HTML
 *   claimsList(req, res, next)   – renders claims list HTML
 *   claimDetail(req, res, next)  – renders claim detail HTML with evidence photos
 */

const db = require('../config/database');
const storageService = require('../services/storageService');
const { getClaimCounts } = require('../services/planService');

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:4000';

function escHtml (str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate (iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

async function dashboard (req, res, next) {
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

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PackageGuard Seller Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #F4F6F9; color: #1A1A2E; }
    .header {
      background: linear-gradient(135deg, #1565C0 0%, #003c8f 100%);
      color: #fff; padding: 18px 32px; display: flex; align-items: center; justify-content: space-between;
    }
    .logo { display: flex; align-items: center; gap: 10px; }
    .logo-icon { width: 38px; height: 38px; background: rgba(255,255,255,0.18); border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .logo-text { font-size: 20px; font-weight: 700; }
    .container { max-width: 1200px; margin: 0 auto; padding: 24px 16px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat-card {
      background: #fff; border-radius: 14px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.07);
    }
    .stat-label { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #90A4AE; margin-bottom: 8px; }
    .stat-value { font-size: 32px; font-weight: 700; color: #1565C0; }
    .card {
      background: #fff; border-radius: 14px; padding: 22px 24px; box-shadow: 0 1px 4px rgba(0,0,0,0.07); margin-bottom: 16px;
    }
    .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #546E7A; margin-bottom: 16px; }
    .btn {
      display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: 8px;
      font-size: 14px; font-weight: 600; cursor: pointer; border: none; text-decoration: none;
      background: #1565C0; color: #fff; transition: opacity 0.15s;
    }
    .btn:hover { opacity: 0.86; }
    .btn-outline { background: transparent; color: #1565C0; border: 1px solid #1565C0; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-icon">🛡</div>
      <div class="logo-text">PackageGuard Seller Dashboard</div>
    </div>
    <div>
      <a href="/v1/seller/web/claims?token=${req.query.token || ''}" class="btn btn-outline" style="color: #fff; border-color: rgba(255,255,255,0.5);">View Claims</a>
    </div>
  </div>
  <div class="container">
    <h1 style="margin-bottom: 24px;">${escHtml(seller.business_name || 'Seller Dashboard')}</h1>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Claims Today</div>
        <div class="stat-value">${counts.today}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">This Week</div>
        <div class="stat-value">${counts.thisWeek}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">This Month</div>
        <div class="stat-value">${counts.thisMonth}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Claims</div>
        <div class="stat-value">${counts.total}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Seller Information</div>
      <p><strong>Seller ID:</strong> <code>${escHtml(seller.seller_id)}</code></p>
      <p><strong>Email:</strong> ${escHtml(seller.email)}</p>
      <p><strong>Plan:</strong> ${escHtml(seller.plan || 'trial')}</p>
      <p><strong>Created:</strong> ${formatDate(seller.created_at)}</p>
    </div>

    <div class="card">
      <div class="card-title">Plan Limits</div>
      <p><strong>Daily:</strong> ${seller.plan_daily_limit || 'Unlimited'}</p>
      <p><strong>Monthly:</strong> ${seller.plan_monthly_limit || 'Unlimited'}</p>
      <p><strong>Total:</strong> ${seller.plan_total_limit || 'Unlimited'}</p>
    </div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    next(err);
  }
}

async function claimsList (req, res, next) {
  try {
    const sellerId = req.user.sellerId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status;

    const params = [sellerId];
    let whereExtra = '';

    if (statusFilter) {
      params.push(statusFilter);
      whereExtra += ` AND c.status = $${params.length}`;
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

    const claims = claimsRes.rows.map(c => ({
      claimId: c.claim_id,
      orderId: c.order_id,
      status: c.status,
      evidenceCount: Number(c.evidence_count || 0),
      submittedAt: c.created_at,
      sellerDecision: c.seller_decision || null,
      sellerViewedAt: c.seller_viewed_at || null,
      verificationUrl: `${PUBLIC_BASE_URL}/v1/verify/${c.claim_id}`
    }));

    const token = req.query.token || '';
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PackageGuard Claims</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #F4F6F9; color: #1A1A2E; }
    .header {
      background: linear-gradient(135deg, #1565C0 0%, #003c8f 100%);
      color: #fff; padding: 18px 32px; display: flex; align-items: center; justify-content: space-between;
    }
    .logo { display: flex; align-items: center; gap: 10px; }
    .logo-icon { width: 38px; height: 38px; background: rgba(255,255,255,0.18); border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .logo-text { font-size: 20px; font-weight: 700; }
    .container { max-width: 1200px; margin: 0 auto; padding: 24px 16px; }
    .btn {
      display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: 8px;
      font-size: 14px; font-weight: 600; cursor: pointer; border: none; text-decoration: none;
      background: #1565C0; color: #fff; transition: opacity 0.15s;
    }
    .btn:hover { opacity: 0.86; }
    .btn-outline { background: transparent; color: #1565C0; border: 1px solid #1565C0; }
    .btn-small { padding: 6px 12px; font-size: 12px; }
    .claim-item {
      background: #fff; border-radius: 14px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.07);
      margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;
    }
    .claim-info { flex: 1; }
    .claim-id { font-family: monospace; font-weight: 600; color: #1565C0; margin-bottom: 4px; }
    .claim-meta { font-size: 13px; color: #90A4AE; }
    .chip {
      display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700;
      margin-right: 8px;
    }
    .chip-open { background: #FFF3E0; color: #E65100; }
    .chip-resolved { background: #E8F5E9; color: #1B5E20; }
    .chip-processing { background: #E3F2FD; color: #1565C0; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-icon">🛡</div>
      <div class="logo-text">PackageGuard Claims</div>
    </div>
    <div>
      <a href="/v1/seller/web/dashboard?token=${token}" class="btn btn-outline" style="color: #fff; border-color: rgba(255,255,255,0.5);">Dashboard</a>
    </div>
  </div>
  <div class="container">
    <h1 style="margin-bottom: 24px;">Claims (${total})</h1>
    ${claims.length === 0 ? '<p>No claims found.</p>' : ''}
    ${claims.map(c => {
      const isResolved = c.sellerDecision === 'APPROVED' || c.sellerDecision === 'REJECTED';
      const statusChip = isResolved 
        ? '<span class="chip chip-resolved">Resolved</span>'
        : c.status === 'COMPLETED'
        ? '<span class="chip chip-processing">Ready for Review</span>'
        : '<span class="chip chip-open">Open</span>';
      return `
      <div class="claim-item">
        <div class="claim-info">
          <div class="claim-id">${escHtml(c.claimId)}</div>
          <div class="claim-meta">
            Order: ${escHtml(c.orderId)} • ${c.evidenceCount} photos • ${formatDate(c.submittedAt)}
            ${statusChip}
            ${c.sellerDecision ? `<span class="chip chip-${c.sellerDecision === 'APPROVED' ? 'resolved' : c.sellerDecision === 'REJECTED' ? 'resolved' : 'open'}">${escHtml(c.sellerDecision)}</span>` : ''}
          </div>
        </div>
        <div>
          <a href="/v1/seller/web/claims/${c.claimId}?token=${token}" class="btn btn-small">View</a>
          <a href="${c.verificationUrl}" class="btn btn-small btn-outline" target="_blank">Verify</a>
        </div>
      </div>`;
    }).join('')}
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    next(err);
  }
}

async function claimDetail (req, res, next) {
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

    // Auto-mark as viewed
    if (!claim.seller_viewed_at) {
      await db.query(
        'UPDATE claims SET seller_viewed_at = NOW() WHERE claim_id = $1',
        [claimId]
      );
    }

    const evidenceRes = await db.query(
      `SELECT evidence_id, step_id, file_hash, captured_at, resolution, mime_type, file_path,
              ai_verdict, ai_confidence, ai_details
       FROM evidence_items
       WHERE claim_id = (SELECT id FROM claims WHERE claim_id = $1)
       ORDER BY sequence_number ASC`,
      [claimId]
    );

    const token = req.query.token || '';
    const verificationUrl = `${PUBLIC_BASE_URL}/v1/verify/${claimId}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Claim ${escHtml(claimId)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #F4F6F9; color: #1A1A2E; }
    .header {
      background: linear-gradient(135deg, #1565C0 0%, #003c8f 100%);
      color: #fff; padding: 18px 32px; display: flex; align-items: center; justify-content: space-between;
    }
    .logo { display: flex; align-items: center; gap: 10px; }
    .logo-icon { width: 38px; height: 38px; background: rgba(255,255,255,0.18); border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
    .logo-text { font-size: 20px; font-weight: 700; }
    .container { max-width: 1200px; margin: 0 auto; padding: 24px 16px; }
    .card {
      background: #fff; border-radius: 14px; padding: 22px 24px; box-shadow: 0 1px 4px rgba(0,0,0,0.07); margin-bottom: 16px;
    }
    .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #546E7A; margin-bottom: 16px; }
    .btn {
      display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: 8px;
      font-size: 14px; font-weight: 600; cursor: pointer; border: none; text-decoration: none;
      background: #1565C0; color: #fff; transition: opacity 0.15s; margin-right: 8px;
    }
    .btn:hover { opacity: 0.86; }
    .btn-outline { background: transparent; color: #1565C0; border: 1px solid #1565C0; }
    .field { margin-bottom: 14px; }
    .field-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #90A4AE; margin-bottom: 3px; }
    .field-value { font-size: 15px; font-weight: 500; }
    .photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
    .photo-item img { width: 100%; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-icon">🛡</div>
      <div class="logo-text">Claim Detail</div>
    </div>
    <div>
      <a href="/v1/seller/web/claims?token=${token}" class="btn btn-outline" style="color: #fff; border-color: rgba(255,255,255,0.5);">Back to Claims</a>
    </div>
  </div>
  <div class="container">
    <h1 style="margin-bottom: 24px;">Claim ${escHtml(claimId)}</h1>
    
    <div class="card">
      <div class="card-title">Claim Information</div>
      <div class="field">
        <div class="field-label">Claim ID</div>
        <div class="field-value"><code>${escHtml(claim.claim_id)}</code></div>
      </div>
      <div class="field">
        <div class="field-label">Order ID</div>
        <div class="field-value">${escHtml(claim.order_id)}</div>
      </div>
      <div class="field">
        <div class="field-label">Status</div>
        <div class="field-value">${escHtml(claim.status)}</div>
      </div>
      <div class="field">
        <div class="field-label">Submitted</div>
        <div class="field-value">${formatDate(claim.created_at)}</div>
      </div>
      ${claim.buyer_notes ? `
      <div class="field">
        <div class="field-label">Buyer Notes</div>
        <div class="field-value">${escHtml(claim.buyer_notes)}</div>
      </div>` : ''}
    </div>

    ${evidenceRes.rows.length > 0 ? `
    <div class="card">
      <div class="card-title">Evidence Photos (${evidenceRes.rows.length})</div>
      <div class="photo-grid">
        ${evidenceRes.rows.map(e => `
          <div class="photo-item">
            <img src="/v1/seller/claims/${claimId}/evidence/${e.evidence_id}/image?token=${token}" alt="Evidence ${e.evidence_id}" />
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    <div class="card">
      <div class="card-title">Actions</div>
      <a href="${verificationUrl}" class="btn" target="_blank">View Verification Report</a>
      <a href="/v1/seller/web/claims?token=${token}" class="btn btn-outline">Back to Claims</a>
    </div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  dashboard,
  claimsList,
  claimDetail
};
