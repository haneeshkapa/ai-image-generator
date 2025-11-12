import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!key) {
    throw new Error("ENCRYPTION_KEY or SESSION_SECRET must be set for API key encryption");
  }
  return key;
}

export function encryptApiKey(apiKey: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Derive key from password
  const salt = crypto.randomBytes(SALT_LENGTH);
  const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, "sha512");
  
  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
  
  let encrypted = cipher.update(apiKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  // Combine salt, iv, authTag, and encrypted data
  return `${salt.toString("hex")}:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decryptApiKey(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(":");
  
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted data format");
  }
  
  const [saltHex, ivHex, authTagHex, encrypted] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  
  // Derive same key
  const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, "sha512");
  
  const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return "****";
  }
  const prefix = apiKey.substring(0, 4);
  const suffix = apiKey.substring(apiKey.length - 4);
  return `${prefix}${"*".repeat(Math.min(apiKey.length - 8, 20))}${suffix}`;
}
