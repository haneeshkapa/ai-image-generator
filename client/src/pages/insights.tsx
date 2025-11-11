import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, ArrowRight, Target, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import type { Insight } from "@shared/schema";

export default function Insights() {
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);

  const { data: insights, isLoading } = useQuery<Insight[]>({
    queryKey: ["/api/insights"],
  });

  const getInsightTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      comparative: "bg-blue-500",
      trend: "bg-purple-500",
      opportunity: "bg-green-500",
    };
    return colors[type] || "bg-gray-500";
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2">AI Insights</h1>
          <p className="text-muted-foreground">
            Discover what makes content perform and engage audiences
          </p>
        </div>
        <Button data-testid="button-generate-insight">
          <Sparkles className="h-4 w-4 mr-2" />
          Generate New Insight
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : insights && insights.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {insights.map((insight) => (
            <Dialog key={insight.id}>
              <DialogTrigger asChild>
                <Card 
                  className="hover-elevate cursor-pointer transition-all"
                  onClick={() => setSelectedInsight(insight)}
                  data-testid={`card-insight-${insight.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        <span className={`h-2 w-2 rounded-full mr-1 ${getInsightTypeColor(insight.insightType)}`} />
                        {insight.insightType}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                        <Target className="h-3 w-3" />
                        {insight.confidence}% conf.
                      </div>
                    </div>
                    <CardTitle className="text-base line-clamp-2">{insight.title}</CardTitle>
                    <CardDescription className="line-clamp-3">
                      {insight.summary}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2 text-xs text-muted-foreground font-mono">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {insight.highPerformerIds?.length || 0} high
                        </span>
                        <span>vs</span>
                        <span>{insight.lowPerformerIds?.length || 0} low</span>
                      </div>
                      <Button variant="ghost" size="sm" className="text-primary">
                        View <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">
                      <span className={`h-2 w-2 rounded-full mr-1 ${getInsightTypeColor(insight.insightType)}`} />
                      {insight.insightType}
                    </Badge>
                    <Badge variant="outline">
                      <Target className="h-3 w-3 mr-1" />
                      {insight.confidence}% confidence
                    </Badge>
                  </div>
                  <DialogTitle className="text-2xl">{insight.title}</DialogTitle>
                  <DialogDescription className="text-base mt-2">
                    {insight.summary}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 mt-4">
                  <div>
                    <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
                      Key Differentiators
                    </h3>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-green-500" />
                              High Performers
                            </h4>
                            <ul className="space-y-2 text-sm">
                              <li className="flex items-start gap-2">
                                <Zap className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                <span>Strong emotional hooks in first 3 seconds</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <Zap className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                <span>Clear value proposition within 100 characters</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <Zap className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                <span>Concrete examples vs abstract concepts</span>
                              </li>
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-muted-foreground rotate-180" />
                              Low Performers
                            </h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              <li className="flex items-start gap-2">
                                <span className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>Generic opening statements</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>Buried call-to-action</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>Vague benefit descriptions</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="flex gap-2 justify-end pt-4 border-t">
                    <Button variant="outline">
                      Export Report
                    </Button>
                    <Button data-testid="button-generate-content">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Content from Insight
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Sparkles className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No insights generated yet</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
              Start crawling content to generate AI-powered insights about what makes content perform
            </p>
            <Button data-testid="button-generate-first-insight">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate First Insight
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
