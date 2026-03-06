/**
 * signingService.js
 *
 * RSA-SHA256 manifest signing service. Signs the SHA-256 hash of each claim's evidence
 * manifest, producing a tamper-evident cryptographic proof stored with the claim.
 *
 * Main exports:
 *   signManifestHash(manifestHashHex)
 *     – signs the hex string with the RSA private key; returns the signature as base64
 *
 * Key source (checked in order):
 *   1. SIGNING_PRIVATE_KEY_PEM env var — required in production
 *   2. Ephemeral key generated at startup — DEVELOPMENT ONLY; the key changes on every
 *      restart, meaning all previously signed claims become unverifiable after a restart
 *
 * To generate a production key:
 *   openssl genrsa -out signing-key.pem 2048
 *   cat signing-key.pem   # paste this value into SIGNING_PRIVATE_KEY_PEM on Render
 *
 * Env vars: SIGNING_PRIVATE_KEY_PEM
 */

const crypto = require('crypto');

function getPrivateKey () {
  if (process.env.SIGNING_PRIVATE_KEY_PEM) {
    return process.env.SIGNING_PRIVATE_KEY_PEM;
  }
  // DEVELOPMENT ONLY: generate ephemeral key if none supplied.
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048
  });
  return privateKey.export({ type: 'pkcs1', format: 'pem' });
}

async function signManifestHash (manifestHashHex) {
  const privateKeyPem = getPrivateKey();
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(manifestHashHex);
  signer.end();
  const signature = signer.sign(privateKeyPem);
  return signature.toString('base64');
}

module.exports = {
  signManifestHash
};

