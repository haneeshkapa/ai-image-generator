import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, CheckCircle, XCircle, Edit3, Sparkles, TrendingUp, Eye, MessageSquare, BarChart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { GeneratedContent } from "@shared/schema";

export default function Review() {
  const [selectedContent, setSelectedContent] = useState<GeneratedContent | null>(null);
  const [rationale, setRationale] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: contents, isLoading } = useQuery<GeneratedContent[]>({
    queryKey: ["/api/content/generated"],
  });

  const feedbackMutation = useMutation({
    mutationFn: async ({ contentId, action, rationale }: { contentId: string; action: string; rationale: string }) => {
      return await apiRequest("POST", "/api/feedback", { contentId, action, rationale });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/content/generated"] });
      setSelectedContent(null);
      setRationale("");
      
      const actionText = variables.action === "approve" ? "approved" : 
                        variables.action === "revise" ? "marked for revision" : "rejected";
      
      toast({
        title: `Content ${actionText}`,
        description: "Feedback captured for preference learning",
      });
    },
  });

  const handleFeedback = (action: string) => {
    if (!selectedContent) return;
    feedbackMutation.mutate({
      contentId: selectedContent.id,
      action,
      rationale,
    });
  };

  const getPlatformIcon = (platform: string) => {
    // Return appropriate styling
    return platform.charAt(0).toUpperCase() + platform.slice(1);
  };

  const filteredContents = contents?.filter(c => 
    platformFilter === "all" || c.platform === platformFilter
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Content Review</h1>
          <p className="text-muted-foreground">
            Approve, revise, or reject AI-generated content drafts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="platform-filter" className="text-sm">Filter:</Label>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-40" id="platform-filter" data-testid="select-platform-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="reddit">Reddit</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="twitter">Twitter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold font-mono">
              {contents?.filter(c => c.status === "pending").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold font-mono text-green-600 dark:text-green-500">
              {contents?.filter(c => c.status === "approved").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Needs Revision</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold font-mono text-yellow-600 dark:text-yellow-500">
              {contents?.filter(c => c.status === "revised").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold font-mono">
              {contents && contents.length > 0 
                ? Math.round((contents.filter(c => c.status === "approved").length / contents.length) * 100)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredContents && filteredContents.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredContents.map((content) => (
            <Card 
              key={content.id} 
              className="hover-elevate cursor-pointer transition-all"
              onClick={() => setSelectedContent(content)}
              data-testid={`card-content-${content.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {getPlatformIcon(content.platform)}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {content.contentType.replace('_', ' ')}
                    </Badge>
                  </div>
                  <Badge variant={
                    content.status === "approved" ? "default" :
                    content.status === "revised" ? "secondary" :
                    content.status === "rejected" ? "destructive" :
                    "outline"
                  }>
                    {content.status}
                  </Badge>
                </div>
                {content.title && (
                  <CardTitle className="text-base line-clamp-2">{content.title}</CardTitle>
                )}
                <CardDescription className="line-clamp-3 mt-2">
                  {content.content}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex gap-3 text-xs text-muted-foreground font-mono">
                    {content.clarityScore !== null && (
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {content.clarityScore}
                      </span>
                    )}
                    {content.hookStrength !== null && (
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        {content.hookStrength}
                      </span>
                    )}
                    {content.alignmentScore !== null && (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {content.alignmentScore}
                      </span>
                    )}
                  </div>
                  {content.status === "pending" && (
                    <span className="text-xs text-muted-foreground">Click to review</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No content to review</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
              Generate insights and content will appear here for your approval
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedContent} onOpenChange={(open) => !open && setSelectedContent(null)}>
        {selectedContent && (
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{getPlatformIcon(selectedContent.platform)}</Badge>
                <Badge variant="secondary">{selectedContent.contentType.replace('_', ' ')}</Badge>
                <Badge variant={
                  selectedContent.status === "approved" ? "default" :
                  selectedContent.status === "revised" ? "secondary" :
                  selectedContent.status === "rejected" ? "destructive" :
                  "outline"
                }>
                  {selectedContent.status}
                </Badge>
              </div>
              {selectedContent.title && (
                <DialogTitle className="text-2xl">{selectedContent.title}</DialogTitle>
              )}
            </DialogHeader>
            
            <div className="space-y-6 mt-4">
              <div>
                <Label className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Content
                </Label>
                <Card className="mt-2">
                  <CardContent className="pt-6">
                    <p className="whitespace-pre-wrap text-sm">{selectedContent.content}</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Label className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3 block">
                  AI Critic Scores
                </Label>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Clarity</span>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="text-2xl font-semibold font-mono">
                        {selectedContent.clarityScore || "N/A"}
                        {selectedContent.clarityScore && <span className="text-sm text-muted-foreground">/100</span>}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Hook Strength</span>
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="text-2xl font-semibold font-mono">
                        {selectedContent.hookStrength || "N/A"}
                        {selectedContent.hookStrength && <span className="text-sm text-muted-foreground">/100</span>}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Alignment</span>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="text-2xl font-semibold font-mono">
                        {selectedContent.alignmentScore || "N/A"}
                        {selectedContent.alignmentScore && <span className="text-sm text-muted-foreground">/100</span>}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {selectedContent.status === "pending" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="rationale">Your Feedback (Optional)</Label>
                    <Textarea
                      id="rationale"
                      placeholder="Explain why you're approving, requesting revision, or rejecting this content..."
                      value={rationale}
                      onChange={(e) => setRationale(e.target.value)}
                      rows={4}
                      data-testid="textarea-rationale"
                    />
                    <p className="text-xs text-muted-foreground">
                      Your feedback helps the AI learn your preferences over time
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="destructive"
                      onClick={() => handleFeedback("reject")}
                      disabled={feedbackMutation.isPending}
                      className="flex-1"
                      data-testid="button-reject"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleFeedback("revise")}
                      disabled={feedbackMutation.isPending}
                      className="flex-1"
                      data-testid="button-revise"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Request Revision
                    </Button>
                    <Button
                      onClick={() => handleFeedback("approve")}
                      disabled={feedbackMutation.isPending}
                      className="flex-1"
                      data-testid="button-approve"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
