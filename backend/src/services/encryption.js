const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Derives a 32-byte key from JWT_SECRET so we don't need a second secret
 * just for this MVP. In a real production system this would be its own
 * KMS-managed key, separate from the auth signing secret — call that out
 * in the README as a known simplification, not something to hide.
 */
function getDerivedKey() {
  const base = process.env.JWT_SECRET;
  if (!base) {
    throw new Error('JWT_SECRET must be set to derive the wallet encryption key.');
  }
  return crypto.createHash('sha256').update(base).digest();
}

function encryptSecret(plaintext) {
  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Store iv + authTag + ciphertext together, base64-encoded, single field.
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

function decryptSecret(payload) {
  const key = getDerivedKey();
  const raw = Buffer.from(payload, 'base64');

  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = raw.subarray(IV_LENGTH + 16);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = { encryptSecret, decryptSecret };
