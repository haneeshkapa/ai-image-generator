import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Image, Video, Sparkles, Loader2, Download, Eye } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Insight, GeneratedContent } from "@shared/schema";

export default function MediaStudio() {
  const { toast } = useToast();
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageSize, setImageSize] = useState<"1024x1024" | "1792x1024" | "1024x1792">("1024x1024");
  const [imageQuality, setImageQuality] = useState<"standard" | "hd">("standard");
  const [selectedInsight, setSelectedInsight] = useState<string>("");
  const [videoPlatform, setVideoPlatform] = useState("youtube");
  const [videoDuration, setVideoDuration] = useState(30);
  const [videoStyle, setVideoStyle] = useState("");

  const { data: insights } = useQuery<Insight[]>({
    queryKey: ["/api/insights"],
  });

  const { data: generatedMedia, isLoading: mediaLoading } = useQuery<GeneratedContent[]>({
    queryKey: ["/api/content/generated"],
    select: (data) => data.filter(item => item.mediaType === "image" || item.mediaType === "video"),
  });

  const generateImageMutation = useMutation({
    mutationFn: async (data: { prompt: string; insightId?: string; size: string; quality: string }) => {
      const res = await apiRequest("POST", "/api/media/generate-image", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content/generated"] });
      toast({ title: "Image generated successfully", description: "Your image is ready for review" });
      setImagePrompt("");
    },
    onError: (error: any) => {
      toast({ title: "Image generation failed", description: error.message, variant: "destructive" });
    },
  });

  const generateVideoMutation = useMutation({
    mutationFn: async (data: { insightId: string; platform: string; duration: number; style?: string }) => {
      const res = await apiRequest("POST", "/api/media/generate-video", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content/generated"] });
      toast({ title: "Video script generated", description: "Your video script is ready for review" });
      setSelectedInsight("");
    },
    onError: (error: any) => {
      toast({ title: "Video generation failed", description: error.message, variant: "destructive" });
    },
  });

  const handleImageGenerate = () => {
    if (!imagePrompt.trim()) {
      toast({ title: "Prompt required", description: "Please enter an image prompt", variant: "destructive" });
      return;
    }
    generateImageMutation.mutate({
      prompt: imagePrompt,
      size: imageSize,
      quality: imageQuality,
    });
  };

  const handleVideoGenerate = () => {
    if (!selectedInsight) {
      toast({ title: "Insight required", description: "Please select an insight", variant: "destructive" });
      return;
    }
    generateVideoMutation.mutate({
      insightId: selectedInsight,
      platform: videoPlatform,
      duration: videoDuration,
      style: videoStyle || undefined,
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Media Studio</h1>
          <p className="text-muted-foreground">Generate images and video scripts with AI</p>
        </div>
        <Sparkles className="h-8 w-8 text-primary" />
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image Generation */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Image className="h-5 w-5 text-primary" />
                  <CardTitle>Image Generation</CardTitle>
                </div>
                <CardDescription>Create AI-generated images from text prompts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="image-prompt">Prompt</Label>
                  <Textarea
                    id="image-prompt"
                    placeholder="A professional marketing infographic showing data-driven insights..."
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="image-size">Size</Label>
                    <Select value={imageSize} onValueChange={(v: any) => setImageSize(v)}>
                      <SelectTrigger id="image-size">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1024x1024">Square (1024x1024)</SelectItem>
                        <SelectItem value="1792x1024">Landscape (1792x1024)</SelectItem>
                        <SelectItem value="1024x1792">Portrait (1024x1792)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image-quality">Quality</Label>
                    <Select value={imageQuality} onValueChange={(v: any) => setImageQuality(v)}>
                      <SelectTrigger id="image-quality">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="hd">HD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleImageGenerate}
                  disabled={generateImageMutation.isPending}
                  className="w-full"
                >
                  {generateImageMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Image
                </Button>
              </CardContent>
            </Card>

            {/* Video Script Generation */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  <CardTitle>Video Script Generation</CardTitle>
                </div>
                <CardDescription>Create video scripts from insights</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="insight-select">Select Insight</Label>
                  <Select value={selectedInsight} onValueChange={setSelectedInsight}>
                    <SelectTrigger id="insight-select">
                      <SelectValue placeholder="Choose an insight..." />
                    </SelectTrigger>
                    <SelectContent>
                      {insights?.map((insight) => (
                        <SelectItem key={insight.id} value={insight.id}>
                          {insight.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="video-platform">Platform</Label>
                  <Select value={videoPlatform} onValueChange={setVideoPlatform}>
                    <SelectTrigger id="video-platform">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="instagram">Instagram Reels</SelectItem>
                      <SelectItem value="twitter">Twitter/X</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="video-duration">Duration (seconds)</Label>
                  <Input
                    id="video-duration"
                    type="number"
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(parseInt(e.target.value) || 30)}
                    min={15}
                    max={180}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="video-style">Style (optional)</Label>
                  <Input
                    id="video-style"
                    placeholder="e.g., professional, casual, energetic..."
                    value={videoStyle}
                    onChange={(e) => setVideoStyle(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleVideoGenerate}
                  disabled={generateVideoMutation.isPending}
                  className="w-full"
                >
                  {generateVideoMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Video Script
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="gallery" className="space-y-6">
          {mediaLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !generatedMedia || generatedMedia.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Sparkles className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No media generated yet</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Start generating images and video scripts to see them here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generatedMedia.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant={item.status === "approved" ? "default" : "secondary"}>
                        {item.mediaType}
                      </Badge>
                      <Badge variant="outline">{item.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {item.mediaType === "image" && item.mediaUrl && (
                      <div className="relative aspect-square rounded-md overflow-hidden bg-muted">
                        <img
                          src={item.mediaUrl}
                          alt={item.title || "Generated image"}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    )}
                    
                    <div>
                      <h4 className="font-medium text-sm mb-1 line-clamp-2">
                        {item.title || "Untitled"}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.content.substring(0, 100)}...
                      </p>
                    </div>

                    {item.mediaType === "video" && item.mediaMetadata && (
                      <div className="text-xs text-muted-foreground">
                        Duration: {(item.mediaMetadata as { duration?: number })?.duration || 30}s
                      </div>
                    )}

                    <div className="flex gap-2">
                      {item.mediaUrl && (
                        <Button variant="outline" size="sm" asChild className="flex-1">
                          <a href={item.mediaUrl} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </a>
                        </Button>
                      )}
                      {item.mediaUrl && (
                        <Button variant="outline" size="sm" asChild className="flex-1">
                          <a href={item.mediaUrl} download>
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
