import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Download, Calendar, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("7d");
  const [metricType, setMetricType] = useState("engagement");

  const platformData = [
    { platform: "Reddit", posts: 45, avgEngagement: 1250, approvalRate: 78 },
    { platform: "YouTube", posts: 23, avgEngagement: 3200, approvalRate: 85 },
    { platform: "Twitter", posts: 67, avgEngagement: 890, approvalRate: 72 },
    { platform: "Blogs", posts: 12, avgEngagement: 2100, approvalRate: 91 },
  ];

  const contentTypeData = [
    { type: "Text Post", value: 45, color: "hsl(var(--chart-1))" },
    { type: "Email Script", value: 23, color: "hsl(var(--chart-2))" },
    { type: "Video Outline", value: 18, color: "hsl(var(--chart-3))" },
    { type: "Tweet Thread", value: 14, color: "hsl(var(--chart-4))" },
  ];

  const performanceTrend = [
    { date: "Mon", crawled: 120, insights: 8, approved: 12, leads: 3 },
    { date: "Tue", crawled: 145, insights: 11, approved: 15, leads: 5 },
    { date: "Wed", crawled: 132, insights: 9, approved: 13, leads: 4 },
    { date: "Thu", crawled: 168, insights: 14, approved: 18, leads: 6 },
    { date: "Fri", crawled: 156, insights: 12, approved: 16, leads: 5 },
    { date: "Sat", crawled: 98, insights: 6, approved: 9, leads: 2 },
    { date: "Sun", crawled: 87, insights: 5, approved: 7, leads: 2 },
  ];

  const topicPerformance = [
    { topic: "SaaS Marketing", insights: 24, content: 32, conversionRate: 18.5 },
    { topic: "Product Launch", insights: 18, content: 24, conversionRate: 22.3 },
    { topic: "Growth Hacking", insights: 15, content: 19, conversionRate: 15.8 },
    { topic: "User Onboarding", insights: 12, content: 16, conversionRate: 20.1 },
    { topic: "Pricing Strategy", insights: 10, content: 14, conversionRate: 16.7 },
  ];

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
          <Button variant="outline" data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export
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
                    <Cell key={`cell-${index}`} fill={entry.color} />
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
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform Performance</CardTitle>
          <CardDescription>Engagement and approval metrics by content source</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Topic Performance</CardTitle>
          <CardDescription>Content generation and conversion by topic category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topicPerformance.map((topic, index) => (
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
                    style={{ width: `${topic.conversionRate * 4}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
