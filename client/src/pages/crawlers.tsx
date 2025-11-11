import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Radio, Pause, Play, Trash2, Settings2, ExternalLink } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { CrawlerConfig } from "@shared/schema";

export default function Crawlers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: crawlers, isLoading } = useQuery<CrawlerConfig[]>({
    queryKey: ["/api/crawlers"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/crawlers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crawlers"] });
      setDialogOpen(false);
      toast({
        title: "Crawler created",
        description: "New crawler configuration added successfully",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/crawlers/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crawlers"] });
      toast({
        title: "Crawler updated",
        description: "Crawler status changed successfully",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/crawlers/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crawlers"] });
      toast({
        title: "Crawler deleted",
        description: "Crawler configuration removed",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      name: formData.get("name"),
      platform: formData.get("platform"),
      sourceUrl: formData.get("sourceUrl"),
      crawlFrequency: formData.get("crawlFrequency"),
      isActive: true,
    });
  };

  const getPlatformBadgeColor = (platform: string) => {
    const colors: Record<string, string> = {
      reddit: "bg-orange-500",
      youtube: "bg-red-500",
      twitter: "bg-blue-500",
      blog: "bg-green-500",
    };
    return colors[platform.toLowerCase()] || "bg-gray-500";
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Web Crawlers</h1>
          <p className="text-muted-foreground">
            Configure and manage content acquisition from multiple sources
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-crawler">
              <Plus className="h-4 w-4 mr-2" />
              Add Crawler
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Crawler Configuration</DialogTitle>
              <DialogDescription>
                Set up a new content source to monitor and analyze
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Crawler Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., SaaS Marketing Subreddit"
                  required
                  data-testid="input-crawler-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select name="platform" required>
                  <SelectTrigger data-testid="select-platform">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reddit">Reddit</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="twitter">Twitter/X</SelectItem>
                    <SelectItem value="blog">Blog/RSS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sourceUrl">Source URL</Label>
                <Input
                  id="sourceUrl"
                  name="sourceUrl"
                  type="url"
                  placeholder="https://reddit.com/r/saas"
                  required
                  data-testid="input-source-url"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crawlFrequency">Crawl Frequency</Label>
                <Select name="crawlFrequency" defaultValue="daily">
                  <SelectTrigger data-testid="select-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-crawler">
                  {createMutation.isPending ? "Creating..." : "Create Crawler"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : crawlers && crawlers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {crawlers.map((crawler) => (
            <Card key={crawler.id} data-testid={`card-crawler-${crawler.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Radio className={`h-4 w-4 ${crawler.isActive ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
                      <CardTitle className="text-lg">{crawler.name}</CardTitle>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${getPlatformBadgeColor(crawler.platform)}`} />
                      {crawler.platform.charAt(0).toUpperCase() + crawler.platform.slice(1)}
                    </CardDescription>
                  </div>
                  <Badge variant={crawler.isActive ? "default" : "secondary"}>
                    {crawler.isActive ? "Active" : "Paused"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    <a 
                      href={crawler.sourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate"
                    >
                      {crawler.sourceUrl}
                    </a>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                    <span>Frequency: {crawler.crawlFrequency}</span>
                    {crawler.lastCrawledAt && (
                      <span>Last: {new Date(crawler.lastCrawledAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleMutation.mutate({ id: crawler.id, isActive: !crawler.isActive })}
                    disabled={toggleMutation.isPending}
                    data-testid={`button-toggle-${crawler.id}`}
                  >
                    {crawler.isActive ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                    {crawler.isActive ? "Pause" : "Resume"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid={`button-settings-${crawler.id}`}
                  >
                    <Settings2 className="h-3 w-3 mr-1" />
                    Settings
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteMutation.mutate(crawler.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-${crawler.id}`}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Radio className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No crawlers configured</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
              Start by adding your first content source to begin gathering insights from the web
            </p>
            <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-crawler">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Crawler
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
