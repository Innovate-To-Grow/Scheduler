const crypto = require("crypto");

function generateEventCode(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const limit = 256 - (256 % chars.length); // 248 — discard bytes >= limit to avoid modulo bias
  let code = "";
  while (code.length < length) {
    const bytes = crypto.randomBytes(length - code.length);
    for (let i = 0; i < bytes.length && code.length < length; i++) {
      if (bytes[i] < limit) {
        code += chars[bytes[i] % chars.length];
      }
    }
  }
  return code;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== "string") return false;
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(hash));
}

module.exports = { generateEventCode, hashPassword, verifyPassword };
