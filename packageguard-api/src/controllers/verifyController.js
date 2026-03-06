/**
 * verifyController.js
 *
 * Public claim verification endpoint — no authentication required. Buyers and sellers
 * share a verification URL; anyone can view a claim's evidence report.
 *
 * Main exports:
 *   publicVerify(req, res, next)
 *     – Detects the caller's Accept header and responds accordingly:
 *       • Browser (text/html): returns a self-contained styled HTML report with embedded
 *         photos (base64), seller decision chip, AI verdict chips, and manifest hash
 *       • API client (application/json): returns structured JSON with the same data
 *
 * Helper functions (not exported):
 *   buildHtml(claim, evidenceRows, verificationUrl)  – builds the full HTML report string
 *   fileToDataUri(storagePath, mimeType)             – downloads photo → base64 data URI
 *   aiVerdictChip(verdict)                           – renders colored AI badge HTML
 *   decisionInfo(decision)                           – maps decision to label + color
 *   formatDate(iso)                                  – human-readable timestamp
 *   escHtml(str)                                     – escapes HTML special characters
 */

const db = require('../config/database');
const storageService = require('../services/storageService');

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:4000';

/* ── helpers ──────────────────────────────────────────────────────────── */

async function fileToDataUri (storagePath, mimeType) {
  try {
    if (!storagePath) return null;
    const buffer = await storageService.downloadFile(storagePath);
    return `data:${mimeType || 'image/jpeg'};base64,${buffer.toString('base64')}`;
  } catch (_) {
    return null;
  }
}

function formatDate (iso) {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  });
}

function decisionInfo (decision) {
  switch ((decision || '').toUpperCase()) {
    case 'APPROVED':          return { label: 'Approved',                color: '#1B5E20', bg: '#E8F5E9', icon: '\u2713' };
    case 'REJECTED':          return { label: 'Rejected',                color: '#B71C1C', bg: '#FFEBEE', icon: '\u2717' };
    case 'MORE_INFO_REQUESTED': return { label: 'More Information Requested', color: '#E65100', bg: '#FFF3E0', icon: '\u2139' };
    default:                  return null;
  }
}

function aiVerdictChip (verdict) {
  if (!verdict) return '';
  const map = {
    REAL:           { label: '\u2713 Real Photo',      bg: '#E8F5E9', color: '#1B5E20' },
    AI_GENERATED:   { label: '\u26A0 AI Generated',    bg: '#FFEBEE', color: '#B71C1C' },
    SCREEN_CAPTURE: { label: '\u26A0 Screen Capture',  bg: '#FFF3E0', color: '#E65100' },
    UNCERTAIN:      { label: '\u2014 Unanalyzed',       bg: '#F4F6F9', color: '#546E7A' }
  };
  const v = map[verdict.toUpperCase()] || map.UNCERTAIN;
  return `<div style="margin-top:6px;text-align:center">
    <span class="chip" style="background:${v.bg};color:${v.color};font-size:11px;">${v.label}</span>
  </div>`;
}

async function buildHtml (claim, evidenceRows, verificationUrl) {
  const sigOk   = !!(claim.manifest_hash && claim.signature);
  const evCount = Number(claim.evidence_count || 0);
  // Order reference is not sensitive data - show it in full
  const orderDisplay = claim.order_id || '\u2014';

  const dataUris = await Promise.all(evidenceRows.map(e => fileToDataUri(e.file_path, e.mime_type)));

  const photoGrid = evidenceRows.length === 0 ? '' : `
      <div class="section-title">Evidence Photos (${evidenceRows.length})</div>
      <div class="photo-grid">
        ${evidenceRows.map((e, i) => {
          const uri = dataUris[i];
          const img = uri
            ? `<img src="${uri}" alt="Evidence ${i + 1}" />`
            : `<div class="no-photo">Photo ${i + 1}<br/>unavailable</div>`;
          return `<div class="photo-card">${img}${aiVerdictChip(e.ai_verdict)}</div>`;
        }).join('\n        ')}
      </div>`;

  const dec = decisionInfo(claim.seller_decision);
  const sellerReviewHtml = dec ? `
  <div class="card">
    <div class="card-title">Seller Review</div>
    <div class="field">
      <div class="field-label">Decision</div>
      <div class="field-value">
        <span class="chip" style="background:${dec.bg};color:${dec.color};">${dec.icon} ${dec.label}</span>
      </div>
    </div>
    ${claim.seller_note ? `
    <div class="field">
      <div class="field-label">Seller Note</div>
      <div class="field-value note-box">${escHtml(claim.seller_note)}</div>
    </div>` : ''}
    ${claim.seller_decided_at ? `
    <div class="field">
      <div class="field-label">Decided</div>
      <div class="field-value">${formatDate(claim.seller_decided_at)}</div>
    </div>` : ''}
  </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PackageGuard Verification \u2014 ${claim.claim_id}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #F4F6F9; color: #1A1A2E; }
    .header {
      background: linear-gradient(135deg, #1565C0 0%, #003c8f 100%);
      color: #fff; padding: 18px 32px;
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
    }
    .logo { display: flex; align-items: center; gap: 10px; }
    .logo-icon {
      width: 38px; height: 38px; background: rgba(255,255,255,0.18);
      border-radius: 9px; display: flex; align-items: center; justify-content: center;
      font-size: 20px;
    }
    .logo-text { font-size: 20px; font-weight: 700; }
    .logo-sub  { font-size: 11px; opacity: 0.72; letter-spacing: 0.5px; text-transform: uppercase; }
    .header-actions { display: flex; gap: 10px; flex-shrink: 0; }
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 18px; border-radius: 8px; font-size: 14px; font-weight: 600;
      cursor: pointer; border: none; transition: opacity 0.15s; font-family: inherit;
    }
    .btn:hover { opacity: 0.86; }
    .btn-outline { background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.35); }
    .btn-white   { background: #fff; color: #1565C0; }
    .container   { max-width: 860px; margin: 0 auto; padding: 0 16px 48px; }
    .banner {
      margin: 24px 0 20px; padding: 20px 24px; border-radius: 14px;
      display: flex; align-items: center; gap: 16px;
      font-size: 20px; font-weight: 700; border: 1.5px solid;
    }
    .banner.ok   { background: #E8F5E9; color: #1B5E20; border-color: #A5D6A7; }
    .banner.fail { background: #FFEBEE; color: #B71C1C; border-color: #EF9A9A; }
    .banner-icon { font-size: 30px; flex-shrink: 0; }
    .banner-sub  { font-size: 13px; font-weight: 400; margin-top: 3px; opacity: 0.8; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    @media (max-width: 620px) { .two-col { grid-template-columns: 1fr; } }
    .card {
      background: #fff; border-radius: 14px; padding: 22px 24px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.07); margin-bottom: 16px;
    }
    .card-title {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.7px; color: #546E7A; margin-bottom: 16px;
    }
    .field + .field { margin-top: 14px; }
    .field-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #90A4AE; margin-bottom: 3px; }
    .field-value { font-size: 15px; font-weight: 500; word-break: break-all; }
    .mono { font-family: 'Courier New', monospace; font-size: 13px; }
    .chip { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    .chip-green { background: #E8F5E9; color: #1B5E20; }
    .chip-red   { background: #FFEBEE; color: #B71C1C; }
    .hash-box {
      background: #F4F6F9; border-radius: 8px; padding: 10px 14px;
      font-family: 'Courier New', monospace; font-size: 12px;
      word-break: break-all; color: #546E7A; margin-top: 8px;
    }
    .note-box {
      background: #F4F6F9; border-radius: 8px; padding: 12px 14px;
      font-size: 14px; font-weight: 400; font-style: italic; color: #1A1A2E;
      border-left: 3px solid #90A4AE;
    }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #546E7A; margin-bottom: 14px; }
    .photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
    .photo-card { border-radius: 10px; overflow: hidden; background: #F4F6F9; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding-bottom: 8px; }
    .photo-card img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
    .no-photo { display: flex; align-items: center; justify-content: center; font-size: 12px; color: #90A4AE; text-align: center; padding: 24px 8px; aspect-ratio: 1; }
    .footer { text-align: center; padding: 20px 16px; font-size: 12px; color: #90A4AE; border-top: 1px solid #E0E0E0; margin-top: 8px; }
    .footer a { color: #1565C0; }
    @media print {
      body { background: #fff; }
      .header-actions { display: none !important; }
      .card { box-shadow: none; border: 1px solid #E0E0E0; page-break-inside: avoid; }
      .photo-card { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

<div class="header">
  <div class="logo">
    <div class="logo-icon">\uD83D\uDEE1</div>
    <div>
      <div class="logo-text">PackageGuard</div>
      <div class="logo-sub">Evidence Verification</div>
    </div>
  </div>
  <div class="header-actions">
    <button class="btn btn-outline" onclick="shareReport()">&#8679;&nbsp;Share</button>
    <button class="btn btn-white" onclick="printReport()">&#8659;&nbsp;Print / Save PDF</button>
  </div>
</div>

<div class="container">

  <div class="banner ${sigOk ? 'ok' : 'fail'}">
    <span class="banner-icon">${sigOk ? '\u2713' : '\u2717'}</span>
    <div>
      <div>${sigOk ? 'Claim Verified' : 'Verification Incomplete'}</div>
      <div class="banner-sub">${sigOk
        ? 'Digital signature validated \u2014 evidence is authentic and unmodified'
        : 'Claim has not yet been fully processed or signature is missing'}</div>
    </div>
  </div>

  <div class="two-col">
    <div class="card">
      <div class="card-title">Claim Details</div>
      <div class="field">
        <div class="field-label">Claim ID</div>
        <div class="field-value mono">${claim.claim_id}</div>
      </div>
      <div class="field">
        <div class="field-label">Order Reference</div>
        <div class="field-value">${orderDisplay}</div>
      </div>
      <div class="field">
        <div class="field-label">Seller ID</div>
        <div class="field-value mono">${claim.seller_id}</div>
      </div>
      <div class="field">
        <div class="field-label">Submitted</div>
        <div class="field-value">${formatDate(claim.created_at)}</div>
      </div>
      <div class="field">
        <div class="field-label">Evidence Items</div>
        <div class="field-value">${evCount} photo${evCount !== 1 ? 's' : ''}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Verification</div>
      <div class="field">
        <div class="field-label">Signature Status</div>
        <div class="field-value">
          <span class="chip ${sigOk ? 'chip-green' : 'chip-red'}">${sigOk ? '\u2713 Valid' : '\u2717 Not signed'}</span>
        </div>
      </div>
      <div class="field">
        <div class="field-label">Signed By</div>
        <div class="field-value">PackageGuard Evidence Service</div>
      </div>
      <div class="field">
        <div class="field-label">Signed At</div>
        <div class="field-value">${formatDate(claim.signed_at)}</div>
      </div>
      <div class="field">
        <div class="field-label">Manifest Hash</div>
        <div class="hash-box">${claim.manifest_hash || '\u2014'}</div>
      </div>
    </div>
  </div>

  ${sellerReviewHtml}

  ${photoGrid ? `<div class="card">${photoGrid}</div>` : ''}

  <div class="footer">
    Verified by PackageGuard Evidence System &nbsp;&middot;&nbsp;
    <a href="${verificationUrl}">${verificationUrl}</a><br/>
    This report can be printed or saved as PDF from your browser.
  </div>

</div>

<script>
  function shareReport() {
    var url = '${verificationUrl}';
    if (navigator.share) {
      navigator.share({ 
        title: 'PackageGuard Verification Report',
        text: 'View this PackageGuard evidence verification report',
        url: url 
      }).catch(function(err) {
        // Fallback to clipboard if share fails
        copyToClipboard(url);
      });
    } else {
      copyToClipboard(url);
    }
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        alert('Verification link copied to clipboard!');
      }).catch(function() {
        // Fallback for older browsers
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          alert('Verification link copied to clipboard!');
        } catch (err) {
          prompt('Copy this link:', text);
        }
        document.body.removeChild(textarea);
      });
    } else {
      // Fallback for older browsers
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        alert('Verification link copied to clipboard!');
      } catch (err) {
        prompt('Copy this link:', text);
      }
      document.body.removeChild(textarea);
    }
  }

  function printReport() {
    // Trigger browser print dialog (Ctrl+P / Cmd+P)
    window.print();
  }
</script>
</body>
</html>`;
}

function escHtml (str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── controller ───────────────────────────────────────────────────────── */

async function publicVerify (req, res, next) {
  try {
    const claimId = req.params.claimId;

    const claimRes = await db.query(
      `SELECT c.claim_id, c.order_id, s.seller_id, c.created_at,
              c.manifest_hash, c.signature, c.signed_at,
              c.attestation_result, c.seller_decision, c.seller_note, c.seller_decided_at,
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

    const verificationUrl = `${PUBLIC_BASE_URL}/v1/verify/${claimId}`;

    // Fetch evidence rows (used by both HTML and JSON paths)
    const evidenceRes = await db.query(
      `SELECT file_path, mime_type, ai_verdict, ai_confidence, ai_details
       FROM evidence_items
       WHERE claim_id = (SELECT id FROM claims WHERE claim_id = $1)
       ORDER BY sequence_number ASC`,
      [claimId]
    );
    const evidenceRows = evidenceRes.rows;

    // Browser request → HTML report
    if (req.accepts('html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(await buildHtml(claim, evidenceRows, verificationUrl));
    }

    // API / JSON request
    // Order reference is not sensitive data - return in full
    res.json({
      valid: true,
      claim: {
        claimId: claim.claim_id,
        orderId: claim.order_id || null,
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
      sellerReview: claim.seller_decision
        ? { decision: claim.seller_decision, note: claim.seller_note, decidedAt: claim.seller_decided_at }
        : null,
      attestation: claim.attestation_result || {},
      evidence: evidenceRows.map(e => ({
        aiAnalysis: e.ai_verdict ? {
          verdict:    e.ai_verdict,
          confidence: e.ai_confidence != null ? Number(e.ai_confidence) : null,
          details:    e.ai_details
        } : null
      }))
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  publicVerify
};
