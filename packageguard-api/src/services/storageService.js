/**
 * storageService.js
 *
 * Provider-agnostic file storage for evidence photos.
 * Currently backed by Supabase Storage, but the public interface is intentionally minimal
 * so you can swap to S3, Google Cloud Storage, Cloudflare R2, or your own server by
 * editing ONLY this file — nothing else in the project needs to change.
 *
 * ── HOW TO SWAP STORAGE PROVIDERS ────────────────────────────────────────────
 *  1. Replace the client() function body and the uploadFile / downloadFile bodies
 *     below with your new provider's SDK calls.
 *  2. Update .env to remove Supabase vars and add whatever your new provider needs.
 *  3. That's it — the rest of the codebase (claimController, processClaimWorker,
 *     sellerController) only calls uploadFile() / downloadFile() and is unaffected.
 *
 * Public interface (any replacement provider must honour these signatures):
 *   uploadFile(storagePath, buffer, mimeType) → Promise<storagePath>
 *     storagePath  string  logical key, e.g. 'clm_abc123/evd_xyz789'
 *     buffer       Buffer  raw file bytes
 *     mimeType     string  e.g. 'image/jpeg'
 *     returns the same storagePath string (stored in evidence_items.file_path)
 *
 *   downloadFile(storagePath) → Promise<Buffer>
 *     returns the raw file bytes as a Node.js Buffer
 *
 * Current provider — Supabase Storage:
 *   SUPABASE_URL               — e.g. https://abcdef.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  — service role key (bypasses RLS; server-side only)
 *   SUPABASE_STORAGE_BUCKET    — bucket name (defaults to 'evidence')
 *
 *   Before first use: Supabase Dashboard → Storage → New bucket
 *                     name: "evidence", visibility: Private
 */

const { createClient } = require('@supabase/supabase-js');

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'evidence';

// TO SWAP PROVIDER: replace client() and the two function bodies below.
let _client = null;

function client () {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for file storage');
    }
    _client = createClient(url, key);
  }
  return _client;
}

/**
 * Upload a Buffer to Supabase Storage.
 * @param {string} storagePath  e.g. 'clm_abc123/evd_xyz789'
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @returns {Promise<string>} storagePath — store this in evidence_items.file_path
 */
async function uploadFile (storagePath, buffer, mimeType) {
  const { error } = await client().storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType || 'application/octet-stream',
      upsert: false
    });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return storagePath;
}

/**
 * Download a file from Supabase Storage.
 * @param {string} storagePath
 * @returns {Promise<Buffer>}
 */
async function downloadFile (storagePath) {
  const { data, error } = await client().storage.from(BUCKET).download(storagePath);
  if (error) throw new Error(`Storage download failed: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

module.exports = { uploadFile, downloadFile };
