const crypto = require('crypto');

/**
 * In production this should delegate to KMS / Vault.
 * Here we model the interface and use a local RSA keypair (env or fallback).
 */

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

