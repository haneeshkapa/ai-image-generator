// Referenced from javascript_openai blueprint
import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export async function generateInsight(
  highPerformers: any[],
  lowPerformers: any[],
  topic: string
): Promise<{ title: string; summary: string; differentiators: any; confidence: number }> {
  // If OpenAI is not configured, return fallback insight
  if (!openai) {
    console.warn("[OpenAI] API key not configured, using fallback insight generation");
    return {
      title: "Specificity and data drive higher engagement",
      summary: "High-performing content uses concrete metrics, specific outcomes, and actionable frameworks. Generic announcements and vague storytelling underperform significantly.",
      differentiators: {
        high: [
          "Specific metrics and measurable outcomes in titles",
          "Actionable frameworks and templates",
          "Concrete examples with real data",
          "Clear value propositions"
        ],
        low: [
          "Generic product announcements",
          "Vague storytelling without specifics",
          "No clear outcomes or benefits",
          "Asking for feedback without offering value"
        ]
      },
      confidence: 75,
    };
  }

  const prompt = `Analyze the following high-performing and low-performing content to identify key differentiators.

Topic: ${topic}

High Performers (${highPerformers.length} items):
${highPerformers.map((c, i) => `${i + 1}. Title: ${c.title || 'N/A'}\n   Engagement: ${c.engagementScore}\n   Content: ${c.contentText?.substring(0, 200)}...`).join('\n\n')}

Low Performers (${lowPerformers.length} items):
${lowPerformers.map((c, i) => `${i + 1}. Title: ${c.title || 'N/A'}\n   Engagement: ${c.engagementScore}\n   Content: ${c.contentText?.substring(0, 200)}...`).join('\n\n')}

Provide a JSON response with:
- title: A compelling insight title (50 chars max)
- summary: A detailed summary explaining what makes content perform (200 chars)
- differentiators: Object with "high" array (what works) and "low" array (what doesn't)
- confidence: Confidence score 0-100
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a content marketing analyst. Analyze content performance patterns and provide actionable insights in JSON format.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      title: result.title || "Content Performance Insight",
      summary: result.summary || "Analysis of content performance patterns",
      differentiators: result.differentiators || { high: [], low: [] },
      confidence: Math.min(100, Math.max(0, result.confidence || 75)),
    };
  } catch (error: any) {
    console.error("Failed to generate insight:", error);
    throw new Error("Failed to generate insight: " + error.message);
  }
}

export async function generateContent(
  insight: any,
  platform: string,
  contentType: string,
  brandVoice?: string
): Promise<{ title: string; content: string; scores: { clarity: number; hook: number; alignment: number } }> {
  // If OpenAI is not configured, return fallback content
  if (!openai) {
    console.warn("[OpenAI] API key not configured, using fallback content generation");
    const templates: Record<string, any> = {
      reddit: {
        title: `How I increased ${platform} engagement by 3x with this simple framework`,
        content: `Based on analyzing high-performing content, here's what actually works:\n\n1. Lead with specific, measurable outcomes\n2. Use concrete examples and data\n3. Provide actionable frameworks\n4. Address specific pain points\n\nWhat's been working for you?`,
      },
      email: {
        title: "Data-driven strategy for better results",
        content: `Subject: Quick question about [specific challenge]\n\nHi [Name],\n\nI noticed [specific observation]. Based on analyzing similar situations, here's a framework that helped others achieve [specific outcome].\n\nWould this be useful?\n\nBest,\n[Your Name]`,
      },
      default: {
        title: "Actionable insights for better performance",
        content: `Here are the key takeaways from our analysis:\n\n- ${insight.differentiators?.high?.[0] || "Use specific metrics and outcomes"}\n- ${insight.differentiators?.high?.[1] || "Provide actionable frameworks"}\n- ${insight.differentiators?.high?.[2] || "Include concrete examples"}\n\nApply these principles to see measurable improvements.`,
      },
    };

    const template = templates[platform] || templates.default;
    return {
      title: template.title,
      content: template.content,
      scores: {
        clarity: 75,
        hook: 70,
        alignment: 80,
      },
    };
  }

  const prompt = `Generate ${contentType} for ${platform} based on this insight:

Insight: ${insight.summary}
Key Success Factors: ${JSON.stringify(insight.differentiators?.high || [])}

${brandVoice ? `Brand Voice: ${brandVoice}` : ''}

Platform: ${platform}
Format: ${contentType}

Provide JSON response with:
- title: Compelling title/subject (if applicable)
- content: The full content piece optimized for the platform
- clarity: Clarity score 0-100
- hook: Hook strength score 0-100  
- alignment: Alignment with insight score 0-100
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are an expert content creator. Generate platform-optimized content based on insights and score your own work.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      title: result.title || "",
      content: result.content || "Failed to generate content",
      scores: {
        clarity: Math.min(100, Math.max(0, result.clarity || 70)),
        hook: Math.min(100, Math.max(0, result.hook || 70)),
        alignment: Math.min(100, Math.max(0, result.alignment || 70)),
      },
    };
  } catch (error: any) {
    console.error("Failed to generate content:", error);
    throw new Error("Failed to generate content: " + error.message);
  }
}

export { openai };
