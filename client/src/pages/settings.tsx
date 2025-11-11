import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings2, Save } from "lucide-react";

export default function Settings() {
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
            <div className="flex items-center justify-between p-4 border rounded-md">
              <div className="space-y-1">
                <div className="font-medium">HubSpot CRM</div>
                <div className="text-sm text-muted-foreground">
                  Connected • Sync leads automatically
                </div>
              </div>
              <Button variant="outline" size="sm">
                Configure
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-md">
              <div className="space-y-1">
                <div className="font-medium">YouTube Data API</div>
                <div className="text-sm text-muted-foreground">
                  Connected • Monitor video performance
                </div>
              </div>
              <Button variant="outline" size="sm">
                Configure
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-md">
              <div className="space-y-1">
                <div className="font-medium">OpenAI API</div>
                <div className="text-sm text-muted-foreground">
                  Connected • Powers insight & content generation
                </div>
              </div>
              <Button variant="outline" size="sm">
                Configure
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline">Reset to Defaults</Button>
          <Button data-testid="button-save-settings">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
