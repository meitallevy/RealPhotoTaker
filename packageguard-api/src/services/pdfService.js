/**
 * PDF report generation service.
 * In production, use a robust library (e.g. pdfkit, wkhtmltopdf, or a separate microservice).
 * Here we stub the interface and return a fake URL.
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

