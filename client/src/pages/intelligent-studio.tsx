import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, ThumbsUp, ThumbsDown, RefreshCw, Loader2, MessageCircle, Image as ImageIcon, Video, FileText } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ConversationMessage {
  role: "assistant" | "user";
  content: string;
}

export default function IntelligentContentStudio() {
  const { toast } = useToast();
  
  // Questionnaire state
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [profileComplete, setProfileComplete] = useState(false);
  const [isQuestioning, setIsQuestioning] = useState(false);
  
  // Generation state
  const [contentType, setContentType] = useState<"text" | "image" | "video">("text");
  const [platform, setPlatform] = useState("instagram");
  const [topic, setTopic] = useState("");
  const [researchCompetitors, setResearchCompetitors] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Generated content
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [previousAttempts, setPreviousAttempts] = useState<any[]>([]);
  const [feedbackText, setFeedbackText] = useState("");

  // Check if profile exists
  const { data: profileData } = useQuery({
    queryKey: ["/api/content/intelligent/profile"],
  });

  useEffect(() => {
    if (profileData?.profile) {
      setProfileComplete(true);
    }
  }, [profileData]);

  // Start questionnaire
  const startQuestionnaire = async () => {
    setIsQuestioning(true);
    try {
      const response = await apiRequest("POST", "/api/content/intelligent/questionnaire", {
        conversationHistory: [],
      });
      const data = await response.json();
      
      if (data.question) {
        setConversationHistory([{
          role: "assistant",
          content: data.question,
        }]);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsQuestioning(false);
    }
  };

  // Answer question
  const answerQuestion = async () => {
    if (!currentAnswer.trim()) return;

    const userMessage: ConversationMessage = {
      role: "user",
      content: currentAnswer,
    };

    const updatedHistory = [...conversationHistory, userMessage];
    setConversationHistory(updatedHistory);
    setCurrentAnswer("");
    setIsQuestioning(true);

    try {
      const response = await apiRequest("POST", "/api/content/intelligent/questionnaire", {
        conversationHistory: updatedHistory.map(m => ({
          role: m.role,
          content: m.content,
        })),
      });
      const data = await response.json();

      if (data.isComplete && data.profile) {
        toast({ title: "Profile Complete!", description: "Your business profile has been created" });
        setProfileComplete(true);
        queryClient.invalidateQueries({ queryKey: ["/api/content/intelligent/profile"] });
      } else if (data.question) {
        setConversationHistory([...updatedHistory, {
          role: "assistant",
          content: data.question,
        }]);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsQuestioning(false);
    }
  };

  // Generate content
  const generateContent = async () => {
    if (!topic.trim()) {
      toast({ title: "Error", description: "Please enter a topic", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setGeneratedContent(null);

    try {
      const response = await apiRequest("POST", "/api/content/intelligent/generate", {
        type: contentType,
        platform,
        topic,
        researchCompetitors,
      });
      const data = await response.json();

      setGeneratedContent(data.generated);
      setPreviousAttempts([]);
      
      toast({ 
        title: "Content Generated!", 
        description: `Quality Score: ${data.generated.qualityScore}/100` 
      });
    } catch (error: any) {
      toast({ title: "Generation Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate with feedback
  const regenerateContent = async (liked: boolean) => {
    if (!generatedContent) return;

    setIsGenerating(true);

    try {
      // Submit feedback
      await apiRequest("POST", "/api/content/intelligent/feedback", {
        contentId: generatedContent.id,
        liked,
        comments: feedbackText,
      });

      if (!liked) {
        // Regenerate
        const response = await apiRequest("POST", "/api/content/intelligent/regenerate", {
          contentId: generatedContent.id,
          feedback: feedbackText,
          previousAttempts,
        });
        const data = await response.json();

        setPreviousAttempts([...previousAttempts, {
          content: generatedContent,
          feedback: feedbackText,
        }]);
        setGeneratedContent(data.regenerated);
        setFeedbackText("");
        
        toast({ title: "Regenerated!", description: "New version created based on your feedback" });
      } else {
        toast({ title: "Great!", description: "Feedback saved. AI is learning your preferences." });
        setFeedbackText("");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Content Generator</h1>
          <p className="text-muted-foreground">
            Create text, images, and videos for your business with AI
          </p>
        </div>
        <Sparkles className="h-8 w-8 text-primary" />
      </div>

      <Tabs defaultValue={profileComplete ? "generate" : "setup"}>
        <TabsList>
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="generate" disabled={!profileComplete}>Generate</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Setup Tab - Business Questionnaire */}
        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Profile Setup</CardTitle>
              <CardDescription>
                Answer a few questions so AI can create personalized content for your business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!profileComplete ? (
                <>
                  {conversationHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <Sparkles className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Let's learn about your business to create better content
                      </p>
                      <Button onClick={startQuestionnaire} disabled={isQuestioning}>
                        {isQuestioning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Start Questionnaire
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Conversation Display */}
                      <div className="space-y-4 max-h-96 overflow-y-auto p-4 border rounded-lg">
                        {conversationHistory.map((msg, i) => (
                          <div
                            key={i}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg p-3 ${
                                msg.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              {msg.content}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Answer Input */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type your answer..."
                          value={currentAnswer}
                          onChange={(e) => setCurrentAnswer(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && answerQuestion()}
                          disabled={isQuestioning}
                        />
                        <Button onClick={answerQuestion} disabled={isQuestioning || !currentAnswer.trim()}>
                          {isQuestioning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Send
                        </Button>
                      </div>

                      <Progress value={(conversationHistory.length / 14) * 100} />
                      <p className="text-xs text-muted-foreground text-center">
                        Question {Math.floor(conversationHistory.length / 2) + 1} of ~7
                      </p>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="h-16 w-16 mx-auto bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Profile Complete!</h3>
                  <p className="text-muted-foreground mb-4">
                    Your business profile is ready. Start generating content!
                  </p>
                  {profileData?.profile && (
                    <div className="text-left max-w-md mx-auto bg-muted p-4 rounded-lg text-sm">
                      <p><strong>Industry:</strong> {profileData.profile.industry}</p>
                      <p><strong>Target Audience:</strong> {profileData.profile.targetAudience}</p>
                      <p><strong>Brand Voice:</strong> {profileData.profile.brandVoice}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <Card>
              <CardHeader>
                <CardTitle>Content Settings</CardTitle>
                <CardDescription>Configure what you want to generate</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Content Type</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={contentType === "text" ? "default" : "outline"}
                      onClick={() => setContentType("text")}
                      className="w-full"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Text
                    </Button>
                    <Button
                      variant={contentType === "image" ? "default" : "outline"}
                      onClick={() => setContentType("image")}
                      className="w-full"
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Image
                    </Button>
                    <Button
                      variant={contentType === "video" ? "default" : "outline"}
                      onClick={() => setContentType("video")}
                      className="w-full"
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Video
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger id="platform">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="twitter">Twitter/X</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topic">Topic/Theme</Label>
                  <Textarea
                    id="topic"
                    placeholder="e.g., How our product helps small businesses save time"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  onClick={generateContent}
                  disabled={isGenerating || !topic.trim()}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isGenerating ? "Generating..." : "Generate Content"}
                </Button>
              </CardContent>
            </Card>

            {/* Output Section */}
            <Card>
              <CardHeader>
                <CardTitle>Generated Content</CardTitle>
                <CardDescription>
                  {generatedContent
                    ? `Quality Score: ${generatedContent.qualityScore}/100`
                    : "Your content will appear here"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!generatedContent ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>Generate content to see results</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Content Display */}
                    <div className="p-4 bg-muted rounded-lg min-h-[200px]">
                      {contentType === "text" && (
                        <p className="whitespace-pre-wrap">{generatedContent.content}</p>
                      )}
                      {contentType === "image" && generatedContent.mediaUrl && (
                        <div>
                          {generatedContent.mediaUrl.includes('placehold.co') ? (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
                              <ImageIcon className="h-16 w-16 mx-auto mb-4 text-yellow-600 dark:text-yellow-400" />
                              <h3 className="font-semibold mb-2">Image Generation Not Configured</h3>
                              <p className="text-sm text-muted-foreground mb-4">
                                To generate real images, add an API key in Settings
                              </p>
                              <div className="text-left bg-white dark:bg-gray-800 p-4 rounded mb-4 text-sm">
                                <p className="font-semibold mb-2">Recommended: Together AI (FREE $25 credits!)</p>
                                <ol className="list-decimal list-inside space-y-1 text-xs">
                                  <li>Sign up: <a href="https://api.together.xyz/signup" target="_blank" className="text-blue-600 underline">api.together.xyz</a></li>
                                  <li>Get $25 free credits (no credit card)</li>
                                  <li>Copy API key</li>
                                  <li>Go to Settings → Add API Key → Together AI</li>
                                  <li>Generate 2,500+ FREE images!</li>
                                </ol>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Generated Prompt: {generatedContent.prompt}
                              </p>
                            </div>
                          ) : (
                            <>
                              <img
                                src={generatedContent.mediaUrl}
                                alt="Generated"
                                className="w-full rounded-lg mb-2"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://placehold.co/1024x1024/png?text=Image+Loading+Failed';
                                }}
                              />
                              <p className="text-sm text-muted-foreground">{generatedContent.prompt}</p>
                            </>
                          )}
                        </div>
                      )}
                      {contentType === "video" && generatedContent.mediaUrl && (
                        <div>
                          {generatedContent.mediaUrl.includes('placehold.co') ? (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
                              <Video className="h-16 w-16 mx-auto mb-4 text-yellow-600 dark:text-yellow-400" />
                              <h3 className="font-semibold mb-2">Video Generation Not Configured</h3>
                              <p className="text-sm text-muted-foreground mb-4">
                                To generate real videos, add an API key in Settings
                              </p>
                              <div className="text-left bg-white dark:bg-gray-800 p-4 rounded mb-4 text-sm space-y-3">
                                <div>
                                  <p className="font-semibold mb-2">Option 1: Luma AI Dream Machine (Recommended)</p>
                                  <ul className="list-disc list-inside space-y-1 text-xs ml-2">
                                    <li>Best text-to-video quality</li>
                                    <li>Sign up: <a href="https://lumalabs.ai" target="_blank" className="text-blue-600 underline">lumalabs.ai</a></li>
                                    <li>~$0.50-1.00 per 5-second video</li>
                                    <li>Settings → Add API Key → Luma AI</li>
                                  </ul>
                                </div>
                                <div>
                                  <p className="font-semibold mb-2">Option 2: RunwayML Gen-3</p>
                                  <ul className="list-disc list-inside space-y-1 text-xs ml-2">
                                    <li>High quality, fast generation</li>
                                    <li>Sign up: <a href="https://runwayml.com" target="_blank" className="text-blue-600 underline">runwayml.com</a></li>
                                    <li>~$0.05 per second</li>
                                    <li>Settings → Add API Key → RunwayML</li>
                                  </ul>
                                </div>
                              </div>
                              <div className="text-left bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs">
                                <p className="font-semibold mb-1">Generated Script:</p>
                                <p className="text-muted-foreground whitespace-pre-wrap">{generatedContent.content}</p>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <video
                                src={generatedContent.mediaUrl}
                                controls
                                className="w-full rounded-lg mb-2 aspect-video bg-black"
                                onError={(e) => {
                                  const videoElement = e.target as HTMLVideoElement;
                                  videoElement.poster = 'https://placehold.co/1280x720/png?text=Video+Loading+Failed';
                                }}
                              >
                                Your browser does not support video playback.
                              </video>
                              <div className="text-sm text-muted-foreground">
                                <p className="font-semibold mb-1">Script:</p>
                                <p className="whitespace-pre-wrap">{generatedContent.content}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Feedback Section */}
                    <div className="space-y-2">
                      <Label>Feedback (optional)</Label>
                      <Textarea
                        placeholder="What would you like to improve? (e.g., make it more casual, add humor, different colors...)"
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        rows={2}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => regenerateContent(false)}
                        disabled={isGenerating}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate
                      </Button>
                      <Button
                        variant="default"
                        className="flex-1"
                        onClick={() => regenerateContent(true)}
                        disabled={isGenerating}
                      >
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    </div>

                    {previousAttempts.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Attempt {previousAttempts.length + 1} • AI is learning your preferences
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Generation History</CardTitle>
              <CardDescription>Your previously generated content</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                History coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
