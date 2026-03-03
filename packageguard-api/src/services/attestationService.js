/**
 * Play Integrity verification service.
 * In production this should call Google's Play Integrity API.
 * Here we model the contract and return a stubbed result.
 */

async function verifyAttestation (token, nonce) {
  if (!token) {
    return {
      verdict: null,
      riskAdjustment: 20
    };
  }

  // TODO: call real Play Integrity API and validate nonce + timestamp.
  const verdict = {
    requestDetails: {
      nonce,
      timestampMillis: Date.now()
    },
    deviceIntegrity: {
      deviceRecognitionVerdict: ['MEETS_DEVICE_INTEGRITY']
    },
    appIntegrity: {
      packageName: 'io.packageguard.app',
      certificateSha256: []
    }
  };

  return {
    verdict,
    riskAdjustment: 0
  };
}

module.exports = {
  verifyAttestation
};

