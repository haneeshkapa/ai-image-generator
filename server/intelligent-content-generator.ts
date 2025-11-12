import OpenAI from "openai";
import { storage } from "./storage";

// OpenRouter API for MiniMax-M2 (free model)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// Initialize OpenRouter client
const openrouter = new OpenAI({
  baseURL: OPENROUTER_BASE_URL,
  apiKey: OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "OpsWatch Content Generator",
  },
});

/**
 * Safely parse JSON from AI response, handling common issues
 */
function safeJsonParse(content: string, fallback: any = {}): any {
  try {
    let cleanContent = content.trim();
    
    // Remove markdown code blocks
    if (cleanContent.includes("```json")) {
      const match = cleanContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (match) {
        cleanContent = match[1].trim();
      }
    } else if (cleanContent.includes("```")) {
      const match = cleanContent.match(/```\s*([\s\S]*?)\s*```/);
      if (match) {
        cleanContent = match[1].trim();
      }
    }
    
    // Try to extract JSON object or array
    const jsonMatch = cleanContent.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      cleanContent = jsonMatch[1];
    }
    
    // If no JSON found, assume it's a plain text question and wrap it
    if (!cleanContent.startsWith('{') && !cleanContent.startsWith('[')) {
      console.log("[JSON Parse] No JSON found, wrapping text as question");
      return {
        isComplete: false,
        question: cleanContent.replace(/^["']|["']$/g, '').trim()
      };
    }
    
    return JSON.parse(cleanContent);
  } catch (error) {
    console.error("[JSON Parse] Failed to parse:", content.substring(0, 100));
    return fallback;
  }
}

interface BusinessProfile {
  industry: string;
  targetAudience: string;
  brandVoice: string;
  goals: string[];
  competitors: string[];
  uniqueSellingPoints: string[];
  contentPreferences: {
    tone: string;
    topics: string[];
    avoidTopics: string[];
  };
}

interface ContentRequest {
  userId: string;
  type: "text" | "image" | "video";
  platform: string;
  topic?: string;
  businessProfile?: BusinessProfile;
}

interface GeneratedContent {
  id: string;
  type: string;
  content: string;
  prompt: string;
  mediaUrl?: string;
  reasoning: string;
  qualityScore: number;
  feedback?: {
    liked: boolean;
    comments: string;
    improvements: string[];
  };
}

export class IntelligentContentGenerator {
  
  /**
   * Step 1: Interactive questionnaire to understand the business
   */
  async askBusinessQuestions(userId: string, conversationHistory: any[] = []): Promise<{ question: string; isComplete: boolean; profile?: BusinessProfile }> {
    try {
      // Simple predefined questions approach (more reliable than AI-generated)
      const questions = [
        "What's your business? (e.g., Moonshine stills for home distillers)",
        "Who's your target audience? (e.g., Hobbyist home brewers, age 25-45)",
        "What tone should your content have? (e.g., Friendly and educational, Casual, Professional)",
      ];

      const answers = conversationHistory.filter(m => m.role === "user").map(m => m.content);
      
      // Check if we have enough answers
      if (answers.length >= questions.length) {
        // Build profile from answers
        const profile: BusinessProfile = {
          industry: answers[0] || "",
          targetAudience: answers[1] || "",
          brandVoice: answers[2] || "",
          goals: ["Generate engaging content"],
          competitors: [],
          uniqueSellingPoints: [],
          contentPreferences: {
            tone: answers[2] || "",
            topics: [],
            avoidTopics: []
          }
        };

        // Save profile
        await storage.upsertSetting({
          key: `business_profile_${userId}`,
          value: profile,
        });

        return {
          question: "",
          isComplete: true,
          profile
        };
      }

      // Return next question
      const nextQuestion = questions[answers.length];
      
      // Save conversation history
      await this.saveConversationHistory(userId, "business_questionnaire", {
        question: nextQuestion,
        timestamp: new Date(),
      });

      return {
        question: nextQuestion,
        isComplete: false
      };

    } catch (error: any) {
      console.error("[Content Generator] Question generation failed:", error);
      throw new Error("Failed to generate question: " + error.message);
    }
  }

  /**
   * Step 2: Research competitors for inspiration
   */
  async researchCompetitors(businessProfile: BusinessProfile): Promise<{ insights: string[]; contentPatterns: any[] }> {
    try {
      const competitorQuery = businessProfile.competitors.join(", ");
      
      const response = await openrouter.chat.completions.create({
        model: "minimax/minimax-m2",
        messages: [
          {
            role: "system",
            content: "You are a market research analyst. Analyze competitors and identify successful content patterns.",
          },
          {
            role: "user",
            content: `Analyze these competitors: ${competitorQuery}

Industry: ${businessProfile.industry}
Target Audience: ${businessProfile.targetAudience}

Provide:
1. Key insights about their content strategy
2. Common patterns in successful posts
3. Gaps they're not addressing
4. Recommendations for differentiation

Return JSON with: {"insights": [], "contentPatterns": [], "gaps": [], "recommendations": []}`,
          },
        ],
      });

      const analysis = safeJsonParse(response.choices[0].message.content || "{}", {
        insights: [],
        contentPatterns: [],
        gaps: [],
        recommendations: []
      });
      return {
        insights: analysis.insights || [],
        contentPatterns: analysis.contentPatterns || [],
      };
    } catch (error: any) {
      console.error("[Content Generator] Competitor research failed:", error);
      return { insights: [], contentPatterns: [] };
    }
  }

  /**
   * Step 3: Generate optimized prompts for content creation
   */
  async generateOptimizedPrompt(request: ContentRequest, competitorInsights?: any): Promise<string> {
    try {
      const profile = request.businessProfile;
      
      const response = await openrouter.chat.completions.create({
        model: "minimax/minimax-m2",
        messages: [
          {
            role: "system",
            content: `You are a prompt engineering expert. Create highly effective prompts for ${request.type} generation.

Consider:
- Content type: ${request.type}
- Platform: ${request.platform}
- Brand voice: ${profile?.brandVoice || "professional"}
- Target audience: ${profile?.targetAudience || "general"}
- Competitor insights: ${JSON.stringify(competitorInsights || {})}

Generate a detailed, specific prompt that will produce high-quality content.`,
          },
          {
            role: "user",
            content: `Create a ${request.type} about: ${request.topic}

Requirements:
- Industry: ${profile?.industry}
- Tone: ${profile?.contentPreferences?.tone}
- Goal: ${profile?.goals?.join(", ")}
- USPs: ${profile?.uniqueSellingPoints?.join(", ")}

Generate the best possible prompt for this content.`,
          },
        ],
      });

      return response.choices[0].message.content || "";
    } catch (error: any) {
      console.error("[Content Generator] Prompt optimization failed:", error);
      return `Create ${request.type} content about ${request.topic} for ${request.platform}`;
    }
  }

  /**
   * Step 4: Generate text content
   */
  async generateTextContent(prompt: string, businessProfile?: BusinessProfile): Promise<GeneratedContent> {
    try {
      const response = await openrouter.chat.completions.create({
        model: "minimax/minimax-m2",
        messages: [
          {
            role: "system",
            content: `You are an expert content creator. Generate engaging, high-quality content.

Brand Voice: ${businessProfile?.brandVoice || "professional"}
Target Audience: ${businessProfile?.targetAudience || "general"}

The content should:
- Be engaging and valuable
- Match the brand voice
- Include a hook, body, and call-to-action
- Be optimized for the platform`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.choices[0].message.content || "";

      // Evaluate quality
      const qualityScore = await this.evaluateContentQuality(content, businessProfile);

      return {
        id: Math.random().toString(36).substr(2, 9),
        type: "text",
        content,
        prompt,
        reasoning: "Generated based on optimized prompt and business profile",
        qualityScore,
      };
    } catch (error: any) {
      console.error("[Content Generator] Text generation failed:", error);
      throw new Error("Failed to generate text: " + error.message);
    }
  }

  /**
   * Step 5: Generate image with feedback loop - REAL IMAGES
   */
  async generateImageWithFeedback(
    prompt: string,
    previousAttempts: any[] = [],
    feedback?: string
  ): Promise<GeneratedContent> {
    try {
      // Improve prompt based on feedback
      let improvedPrompt = prompt;
      if (feedback && previousAttempts.length > 0) {
        improvedPrompt = await this.improvePromptFromFeedback(prompt, previousAttempts, feedback);
      }

      // Try to generate real image using available services
      let imageUrl: string | undefined;
      let imageGenerationMethod = "none";

      // Option 1: Try OpenAI DALL-E (if user has key in settings)
      try {
        const openaiKey = await storage.getSetting("api_key_openai");
        if (openaiKey?.value) {
          const OpenAI = (await import("openai")).default;
          const openai = new OpenAI({ apiKey: openaiKey.value as string });
          
          const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: improvedPrompt,
            n: 1,
            size: "1024x1024",
            quality: "standard",
          });

          imageUrl = response.data[0].url;
          imageGenerationMethod = "DALL-E 3";
          console.log("[Image Gen] Successfully generated with DALL-E 3");
        }
      } catch (error) {
        console.log("[Image Gen] DALL-E not available, trying alternatives...");
      }

      // Option 2: Try Together AI (free credits, good quality)
      if (!imageUrl) {
        try {
          const togetherKey = await storage.getSetting("api_key_together");
          if (togetherKey?.value) {
            const response = await fetch("https://api.together.xyz/v1/images/generations", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${togetherKey.value}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "black-forest-labs/FLUX.1-schnell-Free",
                prompt: improvedPrompt,
                width: 1024,
                height: 1024,
                steps: 4,
                n: 1,
              }),
            });

            const data = await response.json();
            if (data.data?.[0]?.url) {
              imageUrl = data.data[0].url;
              imageGenerationMethod = "Together AI (FLUX)";
              console.log("[Image Gen] Successfully generated with Together AI");
            }
          }
        } catch (error) {
          console.log("[Image Gen] Together AI not available, trying alternatives...");
        }
      }

      // Option 3: Try Replicate (pay-per-use, various models)
      if (!imageUrl) {
        try {
          const replicateKey = await storage.getSetting("api_key_replicate");
          if (replicateKey?.value) {
            const response = await fetch("https://api.replicate.com/v1/predictions", {
              method: "POST",
              headers: {
                "Authorization": `Token ${replicateKey.value}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                version: "black-forest-labs/flux-schnell",
                input: {
                  prompt: improvedPrompt,
                  num_outputs: 1,
                },
              }),
            });

            const prediction = await response.json();
            
            // Wait for image to be ready (polling)
            if (prediction.id) {
              let attempts = 0;
              while (attempts < 30) { // Max 30 seconds
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
                  headers: {
                    "Authorization": `Token ${replicateKey.value}`,
                  },
                });
                
                const status = await statusResponse.json();
                if (status.status === "succeeded" && status.output?.[0]) {
                  imageUrl = status.output[0];
                  imageGenerationMethod = "Replicate (FLUX)";
                  console.log("[Image Gen] Successfully generated with Replicate");
                  break;
                }
                
                if (status.status === "failed") break;
                attempts++;
              }
            }
          }
        } catch (error) {
          console.log("[Image Gen] Replicate not available");
        }
      }

      // Option 4: Fallback to placeholder with detailed instructions
      if (!imageUrl) {
        console.log("[Image Gen] No image generation service available, using placeholder");
        imageUrl = `https://placehold.co/1024x1024/png?text=Image+Generation+Pending`;
        imageGenerationMethod = "Placeholder (Configure API key in Settings)";
      }

      return {
        id: Math.random().toString(36).substr(2, 9),
        type: "image",
        content: improvedPrompt,
        prompt: improvedPrompt,
        mediaUrl: imageUrl,
        reasoning: feedback 
          ? `Generated with ${imageGenerationMethod}. Improved based on feedback: ${feedback}` 
          : `Generated with ${imageGenerationMethod}`,
        qualityScore: 0, // Will be set by user feedback
      };
    } catch (error: any) {
      console.error("[Content Generator] Image generation failed:", error);
      throw new Error("Failed to generate image: " + error.message);
    }
  }

  /**
   * Step 6: Generate video with feedback loop
   */
  async generateVideoWithFeedback(
    prompt: string,
    previousAttempts: any[] = [],
    feedback?: string
  ): Promise<GeneratedContent> {
    try {
      // Improve prompt based on feedback
      let improvedPrompt = prompt;
      if (feedback && previousAttempts.length > 0) {
        improvedPrompt = await this.improvePromptFromFeedback(prompt, previousAttempts, feedback);
      }

      // Generate video script and storyboard
      const videoScript = await openrouter.chat.completions.create({
        model: "minimax/minimax-m2",
        messages: [
          {
            role: "system",
            content: "You are a video content strategist. Create detailed video scripts with scene descriptions.",
          },
          {
            role: "user",
            content: `Create a video script for: ${improvedPrompt}

Include:
- Hook (first 3 seconds)
- Main content (scenes with descriptions)
- Call to action
- Visual descriptions for each scene
- Duration for each segment

Return JSON with: {"script": "", "scenes": [], "totalDuration": 30}`,
          },
        ],
      });

      const videoData = safeJsonParse(videoScript.choices[0].message.content || "{}", {
        script: improvedPrompt,
        scenes: [],
        totalDuration: 30
      });

      // Try to generate real video using available services
      let videoUrl: string | undefined;
      let videoGenerationMethod = "none";

      // Option 1: Try Luma AI Dream Machine (Best quality text-to-video)
      try {
        const lumaKey = await storage.getSetting("api_key_luma");
        if (lumaKey?.value) {
          const response = await fetch("https://api.lumalabs.ai/dream-machine/v1/generations", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${lumaKey.value}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              prompt: improvedPrompt,
              aspect_ratio: "16:9",
            }),
          });

          const result = await response.json();
          
          // Poll for completion
          if (result.id) {
            console.log("[Video Gen] Luma AI generation started, polling...");
            let attempts = 0;
            while (attempts < 60) {
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              const statusResponse = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${result.id}`, {
                headers: {
                  "Authorization": `Bearer ${lumaKey.value}`,
                },
              });
              
              const status = await statusResponse.json();
              if (status.state === "completed" && status.assets?.video) {
                videoUrl = status.assets.video;
                videoGenerationMethod = "Luma AI Dream Machine";
                console.log("[Video Gen] Successfully generated with Luma AI");
                break;
              }
              
              if (status.state === "failed") break;
              attempts++;
            }
          }
        }
      } catch (error) {
        console.log("[Video Gen] Luma AI not available, trying alternatives...");
      }

      // Option 2: Try RunwayML Gen-3 (High quality, faster)
      if (!videoUrl) {
        try {
          const runwayKey = await storage.getSetting("api_key_runway");
          if (runwayKey?.value) {
            const response = await fetch("https://api.runwayml.com/v1/gen3/text-to-video", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${runwayKey.value}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text_prompt: improvedPrompt,
                duration: 5,
                ratio: "16:9",
              }),
            });

            const result = await response.json();
            if (result.id) {
              console.log("[Video Gen] RunwayML generation started, polling...");
              let attempts = 0;
              while (attempts < 60) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const statusResponse = await fetch(`https://api.runwayml.com/v1/tasks/${result.id}`, {
                  headers: {
                    "Authorization": `Bearer ${runwayKey.value}`,
                  },
                });
                
                const status = await statusResponse.json();
                if (status.status === "SUCCEEDED" && status.output?.[0]) {
                  videoUrl = status.output[0];
                  videoGenerationMethod = "RunwayML Gen-3";
                  console.log("[Video Gen] Successfully generated with RunwayML");
                  break;
                }
                
                if (status.status === "FAILED") break;
                attempts++;
              }
            }
          }
        } catch (error) {
          console.log("[Video Gen] RunwayML not available");
        }
      }

      // Fallback to placeholder with instructions
      if (!videoUrl) {
        console.log("[Video Gen] No video generation service available, using placeholder");
        videoUrl = `https://placehold.co/1280x720/png?text=Video+Generation+Pending`;
        videoGenerationMethod = "Placeholder (Configure API key in Settings)";
      }

      return {
        id: Math.random().toString(36).substr(2, 9),
        type: "video",
        content: videoData.script || improvedPrompt,
        prompt: improvedPrompt,
        mediaUrl: videoUrl,
        metadata: {
          scenes: videoData.scenes || [],
          duration: videoData.totalDuration || 30,
        },
        reasoning: feedback 
          ? `Generated with ${videoGenerationMethod}. Improved based on feedback: ${feedback}` 
          : `Generated with ${videoGenerationMethod}`,
        qualityScore: 0,
      };
    } catch (error: any) {
      console.error("[Content Generator] Video generation failed:", error);
      throw new Error("Failed to generate video: " + error.message);
    }
  }

  /**
   * Improve prompt based on negative feedback
   */
  private async improvePromptFromFeedback(
    originalPrompt: string,
    previousAttempts: any[],
    feedback: string
  ): Promise<string> {
    try {
      const response = await openrouter.chat.completions.create({
        model: "minimax/minimax-m2",
        messages: [
          {
            role: "system",
            content: "You are a prompt engineering expert. Improve prompts based on user feedback.",
          },
          {
            role: "user",
            content: `Original prompt: ${originalPrompt}

Previous attempts: ${JSON.stringify(previousAttempts.map(a => ({ prompt: a.prompt, feedback: a.feedback })))}

Latest feedback: ${feedback}

Generate an improved prompt that addresses the feedback and produces better results.`,
          },
        ],
      });

      return response.choices[0].message.content || originalPrompt;
    } catch (error) {
      return originalPrompt;
    }
  }

  /**
   * Evaluate content quality
   */
  private async evaluateContentQuality(content: string, businessProfile?: BusinessProfile): Promise<number> {
    try {
      const response = await openrouter.chat.completions.create({
        model: "minimax/minimax-m2",
        messages: [
          {
            role: "system",
            content: "You are a content quality evaluator. Rate content from 0-100.",
          },
          {
            role: "user",
            content: `Evaluate this content:

${content}

Criteria:
- Engagement potential
- Brand voice match (${businessProfile?.brandVoice})
- Value to audience
- Call-to-action effectiveness
- Platform optimization

Return JSON: {"score": 0-100, "strengths": [], "improvements": []}`,
          },
        ],
      });

      const evaluation = safeJsonParse(response.choices[0].message.content || '{"score": 75}', { score: 75 });
      return evaluation.score || 75;
    } catch (error) {
      return 75; // Default score
    }
  }

  /**
   * Save conversation history for learning
   */
  private async saveConversationHistory(userId: string, type: string, data: any) {
    try {
      const existing = await storage.getSetting(`conversation_${type}_${userId}`);
      const history = existing?.value || [];
      
      history.push({
        ...data,
        timestamp: new Date(),
      });

      // Keep last 50 interactions
      const trimmed = history.slice(-50);

      await storage.upsertSetting({
        key: `conversation_${type}_${userId}`,
        value: trimmed,
      });
    } catch (error) {
      console.error("Failed to save conversation history:", error);
    }
  }

  /**
   * Learn from feedback
   */
  async processFeedback(contentId: string, userId: string, liked: boolean, comments: string) {
    try {
      // Save feedback
      await storage.upsertSetting({
        key: `feedback_${contentId}`,
        value: {
          liked,
          comments,
          timestamp: new Date(),
          userId,
        },
      });

      // Analyze feedback patterns
      const userFeedback = await storage.getSetting(`user_feedback_history_${userId}`);
      const history = userFeedback?.value || [];
      
      history.push({
        contentId,
        liked,
        comments,
        timestamp: new Date(),
      });

      await storage.upsertSetting({
        key: `user_feedback_history_${userId}`,
        value: history.slice(-100), // Keep last 100 feedbacks
      });

      // Learn preferences
      await this.updateUserPreferences(userId, liked, comments);
    } catch (error) {
      console.error("Failed to process feedback:", error);
    }
  }

  /**
   * Update user preferences based on feedback
   */
  private async updateUserPreferences(userId: string, liked: boolean, comments: string) {
    try {
      const preferences = await storage.getSetting(`user_preferences_${userId}`);
      const current = preferences?.value || {
        likedPatterns: [],
        dislikedPatterns: [],
      };

      // Use AI to extract patterns from feedback
      const response = await openrouter.chat.completions.create({
        model: "minimax/minimax-m2",
        messages: [
          {
            role: "system",
            content: "Extract content patterns from user feedback.",
          },
          {
            role: "user",
            content: `User ${liked ? "liked" : "disliked"} content with feedback: ${comments}

Current preferences: ${JSON.stringify(current)}

Extract new patterns and update preferences. Return JSON: {"likedPatterns": [], "dislikedPatterns": []}`,
          },
        ],
      });

      const updated = safeJsonParse(response.choices[0].message.content || "{}", current);

      await storage.upsertSetting({
        key: `user_preferences_${userId}`,
        value: updated,
      });
    } catch (error) {
      console.error("Failed to update preferences:", error);
    }
  }
}

export const intelligentGenerator = new IntelligentContentGenerator();
