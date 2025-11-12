# User API Key Management Feature

## Overview

Users can now configure their own API keys for all integrations directly through the UI. Keys are encrypted and stored securely in the database, allowing each user to use their own API quota and billing.

## Features

### 🔐 Security
- **AES-256-GCM Encryption**: All API keys are encrypted before storage
- **PBKDF2 Key Derivation**: 100,000 iterations with SHA-512
- **Per-Key Salt & IV**: Each key has unique encryption parameters
- **Masked Display**: Keys are never shown in full in the UI
- **Backend-Only Decryption**: Keys are only decrypted on the server

### 📊 Database Schema

New table: `user_api_keys`
- `id` - Unique identifier
- `userId` - Foreign key to users table
- `service` - Service name (openai, youtube, hubspot, reddit, calcom)
- `encryptedKey` - Encrypted API key
- `keyName` - Optional friendly name
- `isActive` - Enable/disable without deleting
- `createdAt`, `updatedAt` - Timestamps

### 🔌 Supported Integrations

1. **OpenAI API** - For AI generation features
2. **YouTube Data API** - For video performance monitoring
3. **HubSpot CRM** - For lead synchronization
4. **Reddit API** - For Reddit content crawling
5. **Cal.com** - For meeting booking automation

### 🎯 Key Priority System

When a feature needs an API key, it checks in this order:
1. **User's personal key** (if configured)
2. **System key** (environment variable)
3. **No key available** (feature disabled)

### 🛠️ API Endpoints

#### GET `/api/user/api-keys`
Returns list of user's configured API keys (masked).

**Response:**
```json
[
  {
    "id": "key-id",
    "service": "openai",
    "keyName": "My Personal Key",
    "maskedKey": "sk-********************xyz",
    "isActive": true,
    "createdAt": "2025-11-12T00:00:00.000Z"
  }
]
```

#### POST `/api/user/api-keys`
Save or update an API key.

**Request:**
```json
{
  "service": "openai",
  "apiKey": "sk-...",
  "keyName": "My Personal Key"
}
```

#### DELETE `/api/user/api-keys/:id`
Delete an API key.

### 💻 UI Components

#### Configure Dialog
- Password input for API key
- Optional name field
- Link to provider's API documentation
- Shows if existing key will be replaced
- Visual feedback for save operation

#### Integration Cards
- Connection status badge (Connected/Not Connected)
- "Your Key" badge when using personal key
- Configure button for all integrations

### 🔧 Backend Services

#### `server/encryption.ts`
- `encryptApiKey(apiKey)` - Encrypt API key
- `decryptApiKey(encrypted)` - Decrypt API key
- `maskApiKey(apiKey)` - Show only first/last 4 chars

#### `server/api-key-manager.ts`
- `getOpenAIClient(userId)` - Get OpenAI client with user/system key
- `getYouTubeApiKey(userId)` - Get YouTube API key
- `getHubSpotApiKey(userId)` - Get HubSpot key
- `getRedditCredentials(userId)` - Get Reddit credentials
- `getCalComApiKey(userId)` - Get Cal.com key

## Usage

### For Users

1. **Navigate to Settings**
2. **Find the Integrations section**
3. **Click "Configure" on any integration**
4. **Enter your API key** (get from provider's dashboard)
5. **Optionally add a name** for the key
6. **Click "Save API Key"**
7. **Key is encrypted and stored** ✅

### For Developers

To use user keys in your code:

```typescript
import { getOpenAIClient } from "./api-key-manager";

// In an authenticated route
const userId = req.session.user?.id;
const openai = await getOpenAIClient(userId);

if (!openai) {
  return res.status(400).json({ 
    error: "OpenAI API key not configured" 
  });
}

// Use openai client normally
const response = await openai.chat.completions.create({...});
```

## Environment Variables

Add to `.env` for encryption:

```bash
# Required for encrypting user API keys
ENCRYPTION_KEY=your-random-64-char-string

# OR use existing session secret
SESSION_SECRET=your-session-secret
```

## Security Best Practices

✅ **What We Do:**
- Encrypt all keys at rest
- Never send keys to frontend
- Per-user key isolation
- Audit trail (created/updated timestamps)
- Secure key deletion

❌ **What We Don't Do:**
- Store keys in plaintext
- Send keys in API responses
- Share keys between users
- Log decrypted keys

## Benefits

### For Users:
- 💰 Use your own API quota/billing
- 🔒 Keep keys secure and encrypted
- 🎛️ Control your own integrations
- 📊 Track usage on your provider accounts

### For Platform Owners:
- 💸 No API costs for user features
- 🚀 Scale without quota concerns
- 🔐 Users responsible for their keys
- ⚡ Better per-user rate limiting

## Migration Path

Existing system keys still work! The system gracefully falls back:
1. Check for user's personal key
2. If not found, use system env var key
3. If neither, feature is disabled for that user

This allows gradual migration where users can add their keys when ready.

## Future Enhancements

- [ ] API key usage analytics
- [ ] Key expiration dates
- [ ] Multiple keys per service
- [ ] Key rotation reminders
- [ ] Webhook notifications for key issues
- [ ] Admin view of all user keys (masked)
- [ ] Bulk key import/export
