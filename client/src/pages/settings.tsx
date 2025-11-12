import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Save, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Integration {
  id: string;
  name: string;
  description: string;
  connected: boolean;
  source?: "user" | "system";
}

const integrationDocs: Record<string, { docs: string; envVar: string }> = {
  openai: {
    docs: "https://platform.openai.com/api-keys",
    envVar: "OPENAI_API_KEY",
  },
  youtube: {
    docs: "https://console.cloud.google.com/apis/credentials",
    envVar: "YOUTUBE_API_KEY",
  },
  hubspot: {
    docs: "https://developers.hubspot.com/docs/api/private-apps",
    envVar: "HUBSPOT_ACCESS_TOKEN",
  },
  reddit: {
    docs: "https://www.reddit.com/prefs/apps",
    envVar: "REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET",
  },
  calcom: {
    docs: "https://app.cal.com/settings/developer/api-keys",
    envVar: "CALCOM_API_KEY",
  },
};

export default function Settings() {
  const { toast } = useToast();
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [keyNameInput, setKeyNameInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { data: qualificationRules } = useQuery<{ approvalThreshold: number }>({
    queryKey: ["/api/settings/qualification"],
  });
  const { data: integrations = [], isLoading: integrationsLoading, error: integrationsError } = useQuery<Integration[]>({
    queryKey: ["/api/settings/integrations"],
    retry: 1,
    staleTime: 30000,
  });
  const [threshold, setThreshold] = useState(75);

  useEffect(() => {
    if (qualificationRules) {
      setThreshold(qualificationRules.approvalThreshold);
    }
  }, [qualificationRules]);

  const thresholdMutation = useMutation({
    mutationFn: async (value: number) => {
      await apiRequest("PUT", "/api/settings/qualification", { approvalThreshold: value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/qualification"] });
      toast({ title: "Saved", description: "Qualification threshold updated" });
    },
  });

  const handleSaveApiKey = async () => {
    if (!selectedIntegration || !apiKeyInput.trim()) {
      toast({ title: "Error", description: "Please enter an API key", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest("POST", "/api/user/api-keys", {
        service: selectedIntegration.id,
        apiKey: apiKeyInput,
        keyName: keyNameInput || undefined,
      });
      
      toast({ title: "Success", description: "API key saved securely" });
      setApiKeyInput("");
      setKeyNameInput("");
      setConfigDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/settings/integrations"] });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure platform preferences and brand voice
        </p>
      </div>

      <div className="grid gap-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Brand Voice</CardTitle>
            <CardDescription>
              Define your brand's tone and style for AI-generated content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brandName">Brand Name</Label>
              <Input 
                id="brandName" 
                placeholder="Your Company Name" 
                data-testid="input-brand-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voiceDescription">Voice Description</Label>
              <Textarea 
                id="voiceDescription"
                placeholder="Describe your brand voice (e.g., professional yet approachable, data-driven, casual and friendly...)"
                rows={4}
                data-testid="textarea-voice-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icpPersona">Ideal Customer Profile (ICP)</Label>
              <Textarea 
                id="icpPersona"
                placeholder="Describe your ideal customer (role, industry, company size, pain points...)"
                rows={4}
                data-testid="textarea-icp"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Generation</CardTitle>
            <CardDescription>
              Preferences for AI-generated content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Automatic Insight Generation</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically generate insights when new content is crawled
                </p>
              </div>
              <Switch data-testid="switch-auto-insights" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Content Critique</Label>
                <p className="text-sm text-muted-foreground">
                  Run AI critic evaluation before human review
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-critique" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Learning Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Continuously learn from your approval feedback
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-learning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>
              Manage external service connections
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {integrationsError && (
              <div className="text-center py-8 text-destructive">
                <p className="text-sm">Failed to load integrations</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(integrationsError as Error).message}
                </p>
              </div>
            )}
            {integrationsLoading && !integrationsError && (
              <div className="text-center py-8 text-muted-foreground">
                Loading integrations...
              </div>
            )}
            {!integrationsLoading && !integrationsError && integrations.map((integration) => (
              <div key={integration.id} className="flex items-center justify-between p-4 border rounded-md">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{integration.name}</div>
                    <Badge variant={integration.connected ? "default" : "secondary"} className="text-xs">
                      {integration.connected ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Connected
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Not Connected
                        </>
                      )}
                    </Badge>
                    {integration.connected && integration.source === "user" && (
                      <Badge variant="outline" className="text-xs">
                        Your Key
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {integration.description}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setSelectedIntegration(integration);
                    setConfigDialogOpen(true);
                  }}
                >
                  Configure
                </Button>
              </div>
            ))}
            {!integrationsLoading && !integrationsError && integrations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No integrations available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuration Dialog */}
        <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Configure {selectedIntegration?.name}</DialogTitle>
              <DialogDescription>
                Set up API credentials for {selectedIntegration?.name}
              </DialogDescription>
            </DialogHeader>
            
            {selectedIntegration && (
              <div className="space-y-4 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="Enter your API key..."
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your key will be encrypted and stored securely
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="key-name">Name (optional)</Label>
                    <Input
                      id="key-name"
                      placeholder="e.g., My Personal Key"
                      value={keyNameInput}
                      onChange={(e) => setKeyNameInput(e.target.value)}
                    />
                  </div>
                </div>

                <div className="rounded-lg border p-4 bg-muted/50">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-medium">Need an API key?</p>
                      <p className="text-sm text-muted-foreground">
                        Get your API key from {selectedIntegration.name}'s dashboard
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="mt-2"
                      >
                        <a
                          href={integrationDocs[selectedIntegration.id]?.docs}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Get API Key
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>

                {selectedIntegration.connected && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-sm text-green-600 dark:text-green-500">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>You already have an API key configured. Saving will replace it.</span>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setConfigDialogOpen(false);
                setApiKeyInput("");
                setKeyNameInput("");
              }}>
                Cancel
              </Button>
              <Button onClick={handleSaveApiKey} disabled={isSaving || !apiKeyInput.trim()}>
                {isSaving ? "Saving..." : "Save API Key"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex justify-end gap-2">
          <Button variant="outline">Reset to Defaults</Button>
          <Button data-testid="button-save-settings">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lead Qualification</CardTitle>
            <CardDescription>Control the minimum critic score before a lead is created automatically</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Approval Threshold</Label>
              <span className="font-mono text-lg">{threshold}</span>
            </div>
            <Slider
              value={[threshold]}
              min={50}
              max={100}
              step={1}
              onValueChange={(values) => setThreshold(values[0])}
            />
            <div className="flex justify-end">
              <Button onClick={() => thresholdMutation.mutate(threshold)} disabled={thresholdMutation.isPending}>
                {thresholdMutation.isPending ? "Saving..." : "Update Threshold"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
