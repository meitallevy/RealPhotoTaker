const fs = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const claimService = require('../services/claimService');
const db = require('../config/database');
const { getTempChunkPath, getFinalEvidencePath } = require('../config/storage');
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

    // Single-chunk or simplified flow.
    let finalPath;
    if (totalChunks <= 1) {
      finalPath = getFinalEvidencePath(claimId, uploadId, file.originalname);
      fs.renameSync(file.path, finalPath);
    } else {
      // Chunked: store chunk, and if last chunk, assemble.
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

      // Last chunk: assemble all.
      finalPath = getFinalEvidencePath(claimId, uploadId, file.originalname);
      const writeStream = fs.createWriteStream(finalPath);
      for (let i = 0; i < totalChunks; i++) {
        const partPath = getTempChunkPath(uploadId, i);
        const data = fs.readFileSync(partPath);
        writeStream.write(data);
        fs.unlinkSync(partPath);
      }
      writeStream.end();
    }

    const fileBuffer = fs.readFileSync(finalPath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const evidenceId = `evd_${uuidv4().replace(/-/g, '').slice(0, 8)}`;

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
        finalPath,
        `sha256:${hash}`,
        file.size,
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

    // Mark claim as PROCESSING and trigger async worker.
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

    res.json({
      claimId,
      status: 'PROCESSING',
      estimatedProcessingTime: 30,
      statusCheckEndpoint: `/v1/claims/${claimId}/status`
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

