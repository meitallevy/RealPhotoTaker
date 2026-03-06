/**
 * claimController.js
 *
 * HTTP handlers for the buyer claim submission flow. No authentication is required —
 * buyers do not have accounts. Evidence files are hashed, uploaded to Supabase Storage,
 * and recorded in the database. Processing (AI analysis, signing, email) happens
 * asynchronously after the complete() call.
 *
 * Main exports:
 *   initiate(req, res, next)       – create a new claim; returns claimId + nonce
 *   uploadEvidence(req, res, next) – receive a photo (single or chunked); hash + upload to storage
 *   complete(req, res, next)       – mark uploads done; kick off processClaimWorker asynchronously
 *   status(req, res, next)         – return current claim processing status
 */

const fs = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const claimService = require('../services/claimService');
const db = require('../config/database');
const { getTempChunkPath } = require('../config/storage');
const storageService = require('../services/storageService');
const { processClaim } = require('../workers/processClaimWorker');

async function initiate (req, res, next) {
  try {
    const result = await claimService.initiateClaim(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function uploadEvidence (req, res, next) {
  try {
    const claimId = req.params.claimId;
    const file = req.file;
    const metadataRaw = req.body.metadata;
    const metadata = metadataRaw ? JSON.parse(metadataRaw) : {};

    const chunkIndex = Number(req.header('X-Chunk-Index') ?? 0);
    const totalChunks = Number(req.header('X-Total-Chunks') ?? 1);
    const uploadId = req.header('X-Upload-Id') || uuidv4();

    if (!file) {
      const err = new Error('Missing file');
      err.status = 400;
      throw err;
    }

    let fileBuffer;

    if (totalChunks <= 1) {
      // Single-chunk: read buffer and clean up multer's temp file
      fileBuffer = fs.readFileSync(file.path);
      fs.unlinkSync(file.path);
    } else {
      // Multi-chunk: save chunk to temp dir
      const tempPath = getTempChunkPath(uploadId, chunkIndex);
      fs.renameSync(file.path, tempPath);

      if (chunkIndex < totalChunks - 1) {
        return res.json({
          received: true,
          partial: true,
          uploadId,
          chunkIndex
        });
      }

      // Last chunk: assemble all chunks into one buffer, then clean up
      const parts = [];
      for (let i = 0; i < totalChunks; i++) {
        const partPath = getTempChunkPath(uploadId, i);
        parts.push(fs.readFileSync(partPath));
        fs.unlinkSync(partPath);
      }
      fileBuffer = Buffer.concat(parts);
    }

    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const evidenceId = `evd_${uuidv4().replace(/-/g, '').slice(0, 8)}`;

    // Upload to Supabase Storage — path format: {claimId}/{evidenceId}
    const storagePath = `${claimId}/${evidenceId}`;
    await storageService.uploadFile(storagePath, fileBuffer, file.mimetype);

    await db.query(
      `INSERT INTO evidence_items (
        evidence_id, claim_id, step_id, sequence_number, file_path, file_hash,
        file_size_bytes, mime_type, captured_at, device_timezone, resolution
      ) VALUES (
        $1,
        (SELECT id FROM claims WHERE claim_id = $2),
        $3,$4,$5,$6,$7,$8,$9,$10,$11
      )`,
      [
        evidenceId,
        claimId,
        metadata.stepId || null,
        metadata.sequenceNumber || 1,
        storagePath,
        `sha256:${hash}`,
        fileBuffer.length,
        file.mimetype,
        metadata.capturedAt || null,
        metadata.deviceTimezone || null,
        metadata.resolution || null
      ]
    );

    const progressRes = await db.query(
      `SELECT COUNT(*) AS total
       FROM evidence_items
       WHERE claim_id = (SELECT id FROM claims WHERE claim_id = $1)`,
      [claimId]
    );

    const totalFiles = Number(progressRes.rows[0].total || 1);

    res.json({
      evidenceId,
      received: true,
      uploadProgress: {
        totalFiles,
        uploadedFiles: totalFiles,
        pendingFiles: 0
      }
    });
  } catch (err) {
    next(err);
  }
}

async function complete (req, res, next) {
  try {
    const claimId = req.params.claimId;

    await db.query(
      `UPDATE claims SET status = 'PROCESSING' WHERE claim_id = $1`,
      [claimId]
    );

    setImmediate(() => {
      processClaim(claimId).catch((e) => {
        // eslint-disable-next-line no-console
        console.error('processClaim failed', e);
      });
    });

    const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:4000';
    res.json({
      claimId,
      status: 'PROCESSING',
      estimatedProcessingTime: 30,
      statusCheckEndpoint: `/v1/claims/${claimId}/status`,
      verificationUrl: `${PUBLIC_BASE_URL}/v1/verify/${claimId}`
    });
  } catch (err) {
    next(err);
  }
}

async function status (req, res, next) {
  try {
    const claimId = req.params.claimId;
    const result = await claimService.getStatus(claimId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  initiate,
  uploadEvidence,
  complete,
  status
};
