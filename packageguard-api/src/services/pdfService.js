/**
 * pdfService.js
 *
 * Generates a downloadable PDF evidence report for a completed claim. Currently a stub —
 * the function returns a placeholder CDN URL. The HTML verification report at
 * /v1/verify/:claimId already serves as a printable alternative.
 *
 * Main exports:
 *   generateClaimPdf(claim, evidenceItems)
 *     – builds and stores a PDF; returns the public download URL
 *
 * TODO: implement using pdfkit, puppeteer/Playwright (print the HTML report), or an
 *       external PDF microservice. Store the result in Supabase Storage and return the URL.
 */

async function generateClaimPdf (claim, evidenceItems) {
  void evidenceItems;
  // TODO: implement real PDF generation.
  const fakeUrl = `https://cdn.packageguard.io/reports/${claim.claim_id}.pdf`;
  return fakeUrl;
}

module.exports = {
  generateClaimPdf
};

