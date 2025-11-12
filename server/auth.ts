import crypto from "crypto";
import { storage } from "./storage";
import type { User } from "@shared/schema";

const HASH_ALGO = "sha512";
const ITERATIONS = 120000;
const KEYLEN = 64;

function getSalt() {
  return process.env.AUTH_SALT || process.env.SESSION_SECRET || "opswatch-salt";
}

export function hashPassword(password: string) {
  return crypto.pbkdf2Sync(password, getSalt(), ITERATIONS, KEYLEN, HASH_ALGO).toString("hex");
}

export function verifyPassword(password: string, hash: string) {
  const candidate = hashPassword(password);
  return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(hash, "hex"));
}

export async function ensureDefaultAdmin() {
  const email = process.env.ADMIN_EMAIL || "admin@opswatch.local";
  const password = process.env.ADMIN_PASSWORD || "changeme";
  const normalizedEmail = email.toLowerCase();
  const existing = await storage.getUserByEmail(normalizedEmail);
  if (existing) {
    return existing;
  }
  const user = await storage.createUser({
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    role: "admin",
  });
  return user;
}

export function sanitizeUser(user: User) {
  const { passwordHash, ...safeFields } = user;
  return safeFields;
}
