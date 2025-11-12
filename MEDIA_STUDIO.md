# Media Studio - Image & Video Generation

This document describes the new Media Studio feature that enables AI-powered image and video generation.

## Overview

Media Studio adds image and video generation capabilities to OpsWatch, allowing users to:
- Generate AI images from text prompts using DALL-E 3
- Create video scripts optimized for social media platforms
- Manage and review generated media assets

## Architecture

### Database Schema Changes

Added new fields to `generated_content` table:
- `mediaUrl` - URL to the generated image or video
- `mediaType` - Type of media (image, video, or null for text content)
- `mediaMetadata` - JSON metadata including generation parameters

### API Endpoints

#### POST `/api/media/generate-image`
Generates an image using DALL-E 3.

**Request Body:**
```json
{
  "prompt": "A professional marketing infographic...",
  "insightId": "optional-insight-id",
  "topicId": "optional-topic-id",
  "size": "1024x1024" | "1792x1024" | "1024x1792",
  "quality": "standard" | "hd"
}
```

**Response:**
```json
{
  "id": "generated-content-id",
  "mediaUrl": "https://...",
  "content": "revised prompt",
  "mediaType": "image",
  ...
}
```

#### POST `/api/media/generate-video`
Generates a video script based on an insight.

**Request Body:**
```json
{
  "insightId": "required-insight-id",
  "platform": "youtube" | "tiktok" | "instagram" | "twitter",
  "duration": 30,
  "style": "optional style description",
  "topicId": "optional-topic-id"
}
```

**Response:**
```json
{
  "id": "generated-content-id",
  "content": "full video script",
  "mediaMetadata": {
    "scenes": [...],
    "voiceoverText": "...",
    "duration": 30
  },
  ...
}
```

### OpenAI Service Functions

#### `generateImage(prompt, size, quality)`
Calls DALL-E 3 to generate an image from a text prompt.

#### `generateVideoPrompt(insight, platform, duration, style)`
Uses GPT-5 to create a platform-optimized video script with:
- Full script with timing
- Scene-by-scene breakdown
- Voiceover narration text

## UI Components

### Media Studio Page (`/media-studio`)

Two main tabs:

1. **Generate Tab**
   - Image Generation panel: Prompt input, size/quality selection
   - Video Script panel: Insight selection, platform, duration, style

2. **Gallery Tab**
   - Grid view of all generated media
   - Preview images inline
   - Download/view buttons for media assets
   - Status badges (pending, approved, etc.)

### Navigation
Added "Media Studio" menu item to the main sidebar with an Image icon.

## Usage Flow

### Image Generation
1. Navigate to Media Studio → Generate tab
2. Enter a descriptive prompt
3. Select size (square, landscape, portrait) and quality
4. Click "Generate Image"
5. Image appears in Gallery tab with download/view options

### Video Script Generation
1. Navigate to Media Studio → Generate tab
2. Select an existing insight
3. Choose target platform (YouTube, TikTok, Instagram, Twitter)
4. Set duration (15-180 seconds)
5. Optionally specify style (professional, casual, energetic, etc.)
6. Click "Generate Video Script"
7. Script appears in Gallery with scene breakdown in metadata

## Environment Variables

Requires `OPENAI_API_KEY` to be set in `.env` file for full functionality.

If not configured, image generation will fail gracefully with an error message.

## Future Enhancements

- Integration with actual video generation APIs (Runway, Pika, etc.)
- Bulk generation from multiple insights
- Style templates and presets
- Direct upload to social media platforms
- A/B testing for generated media
- Animation and transition suggestions
