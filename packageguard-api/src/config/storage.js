/**
 * storage.js  (temp chunk config — NOT permanent storage)
 *
 * Manages the temporary directory used to hold individual chunks during a multi-part
 * evidence upload. Chunks live here only for the duration of a single upload request;
 * once all chunks arrive they are assembled into a Buffer and uploaded to permanent
 * storage via storageService.js, then the temp files are deleted.
 *
 * For permanent evidence file storage, see: src/services/storageService.js
 *
 * Main exports:
 *   getTempChunkPath(uploadId, chunkIndex)
 *     – returns the full local path for one chunk of a resumable upload
 *
 * Env vars: TEMP_CHUNKS_DIR (optional, defaults to OS tmpdir/pg-chunks)
 */

const path = require('path');
const os = require('os');
const fs = require('fs');

// Temporary directory for in-progress chunked uploads.
// These files live only for the duration of a single upload request — ephemeral storage is fine.
const TEMP_CHUNKS_ROOT = process.env.TEMP_CHUNKS_DIR || path.join(os.tmpdir(), 'pg-chunks');

if (!fs.existsSync(TEMP_CHUNKS_ROOT)) {
  fs.mkdirSync(TEMP_CHUNKS_ROOT, { recursive: true });
}

function getTempChunkPath (uploadId, chunkIndex) {
  return path.join(TEMP_CHUNKS_ROOT, `${uploadId}_${chunkIndex}`);
}

module.exports = { getTempChunkPath };
