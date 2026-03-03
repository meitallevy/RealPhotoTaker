const path = require('path');
const fs = require('fs');

const UPLOAD_ROOT = process.env.UPLOAD_ROOT || path.join(__dirname, '..', '..', 'uploads');
const TEMP_CHUNKS_ROOT = path.join(UPLOAD_ROOT, '_chunks');

function ensureDir (dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

ensureDir(UPLOAD_ROOT);
ensureDir(TEMP_CHUNKS_ROOT);

function getTempChunkPath (uploadId, chunkIndex) {
  return path.join(TEMP_CHUNKS_ROOT, `${uploadId}_${chunkIndex}`);
}

function getFinalEvidencePath (claimId, evidenceId, originalName) {
  const dir = path.join(UPLOAD_ROOT, claimId);
  ensureDir(dir);
  const safeName = originalName || `${evidenceId}.bin`;
  return path.join(dir, safeName);
}

module.exports = {
  UPLOAD_ROOT,
  TEMP_CHUNKS_ROOT,
  getTempChunkPath,
  getFinalEvidencePath
};

