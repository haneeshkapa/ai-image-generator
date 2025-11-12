import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Download, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface AnalyticsSummary {
  platformData: Array<{ platform: string; posts: number; avgEngagement: number; approvalRate: number }>;
  contentTypeData: Array<{ type: string; value: number }>;
  performanceTrend: Array<{ date: string; crawled: number; insights: number; approved: number; leads: number }>;
  topicPerformance: Array<{ topic: string; insights: number; content: number; conversionRate: number }>;
}

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("7d");
  const { data, isLoading } = useQuery<AnalyticsSummary>({
    queryKey: [`/api/analytics/summary?range=${timeRange}`],
  });
  const { toast } = useToast();
  const [isExporting, setExporting] = useState(false);

  const platformData = data?.platformData ?? [];
  const contentTypeData = data?.contentTypeData ?? [];
  const performanceTrend = data?.performanceTrend ?? [];
  const topicPerformance = data?.topicPerformance ?? [];

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await fetch(`/api/analytics/export?range=${timeRange}`, { credentials: "include" });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      await downloadBlob(url, `analytics-${timeRange}.csv`);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({ title: "Export failed", description: error.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Analytics</h1>
          <p className="text-muted-foreground">
            Performance metrics and content intelligence insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32" data-testid="select-timerange">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            data-testid="button-export"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription className="mt-1">
                  Daily activity across the content pipeline
                </CardDescription>
              </div>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="crawled" stroke="hsl(var(--chart-1))" strokeWidth={2} name="Crawled" />
                  <Line type="monotone" dataKey="insights" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Insights" />
                  <Line type="monotone" dataKey="approved" stroke="hsl(var(--chart-3))" strokeWidth={2} name="Approved" />
                  <Line type="monotone" dataKey="leads" stroke="hsl(var(--chart-4))" strokeWidth={2} name="Leads" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Content Type Distribution</CardTitle>
                <CardDescription className="mt-1">
                  Breakdown of generated content formats
                </CardDescription>
              </div>
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={contentTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ type, percent }) => `${type} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {contentTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform Performance</CardTitle>
          <CardDescription>Engagement and approval metrics by content source</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={platformData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="platform" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="posts" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Posts" />
                <Bar dataKey="avgEngagement" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Avg Engagement" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Topic Performance</CardTitle>
          <CardDescription>Content generation and conversion by topic category</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <div className="space-y-4">
              {topicPerformance.length === 0 ? (
                <p className="text-sm text-muted-foreground">No topics available for this range.</p>
              ) : (
                topicPerformance.map((topic, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-md border">
                    <div className="flex-1">
                      <h4 className="font-medium mb-2">{topic.topic}</h4>
                      <div className="flex gap-4 text-sm text-muted-foreground font-mono">
                        <span>{topic.insights} insights</span>
                        <span>•</span>
                        <span>{topic.content} content pieces</span>
                        <span>•</span>
                        <Badge variant="secondary" className="text-xs">
                          {topic.conversionRate}% conversion
                        </Badge>
                      </div>
                    </div>
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${Math.min(100, topic.conversionRate)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function downloadBlob(url: string, name: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
