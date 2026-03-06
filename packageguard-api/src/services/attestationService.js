/**
 * attestationService.js
 *
 * Stub for Android Play Integrity attestation. In production this should call Google's
 * Play Integrity API to verify the device and app have not been tampered with.
 * Currently always returns a permissive verdict so the flow works without the API.
 *
 * Main exports:
 *   verifyAttestation(token, nonce)
 *     – validates the Play Integrity token (stub: always passes); returns { verdict, riskAdjustment }
 *
 * TODO: install @googleapis/playdeveloperreporting or call the REST API directly,
 *       validate the nonce matches the claim nonce, and check timestampMillis freshness.
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

