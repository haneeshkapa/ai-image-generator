import { storage } from "./storage";
import { decryptApiKey } from "./encryption";
import OpenAI from "openai";

export async function getOpenAIClient(userId?: string): Promise<OpenAI | null> {
  // Try user key first if userId provided
  if (userId) {
    const userKey = await storage.getUserApiKeyByService(userId, "openai");
    if (userKey && userKey.isActive) {
      try {
        const apiKey = decryptApiKey(userKey.encryptedKey);
        return new OpenAI({ apiKey });
      } catch (error) {
        console.error("[OpenAI] Failed to decrypt user API key:", error);
      }
    }
  }

  // Fall back to system key
  if (process.env.OPENAI_API_KEY) {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return null;
}

export async function getYouTubeApiKey(userId?: string): Promise<string | null> {
  if (userId) {
    const userKey = await storage.getUserApiKeyByService(userId, "youtube");
    if (userKey && userKey.isActive) {
      try {
        return decryptApiKey(userKey.encryptedKey);
      } catch (error) {
        console.error("[YouTube] Failed to decrypt user API key:", error);
      }
    }
  }
  return process.env.YOUTUBE_API_KEY || null;
}

export async function getHubSpotApiKey(userId?: string): Promise<string | null> {
  if (userId) {
    const userKey = await storage.getUserApiKeyByService(userId, "hubspot");
    if (userKey && userKey.isActive) {
      try {
        return decryptApiKey(userKey.encryptedKey);
      } catch (error) {
        console.error("[HubSpot] Failed to decrypt user API key:", error);
      }
    }
  }
  return process.env.HUBSPOT_ACCESS_TOKEN || process.env.HUBSPOT_CONNECTOR || null;
}

export async function getRedditCredentials(userId?: string): Promise<{ clientId: string; clientSecret: string } | null> {
  if (userId) {
    const userKey = await storage.getUserApiKeyByService(userId, "reddit");
    if (userKey && userKey.isActive) {
      try {
        const decrypted = decryptApiKey(userKey.encryptedKey);
        const [clientId, clientSecret] = decrypted.split(":");
        if (clientId && clientSecret) {
          return { clientId, clientSecret };
        }
      } catch (error) {
        console.error("[Reddit] Failed to decrypt user API key:", error);
      }
    }
  }
  
  if (process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET) {
    return {
      clientId: process.env.REDDIT_CLIENT_ID,
      clientSecret: process.env.REDDIT_CLIENT_SECRET,
    };
  }
  
  return null;
}

export async function getCalComApiKey(userId?: string): Promise<string | null> {
  if (userId) {
    const userKey = await storage.getUserApiKeyByService(userId, "calcom");
    if (userKey && userKey.isActive) {
      try {
        return decryptApiKey(userKey.encryptedKey);
      } catch (error) {
        console.error("[Cal.com] Failed to decrypt user API key:", error);
      }
    }
  }
  return process.env.CALCOM_API_KEY || null;
}
