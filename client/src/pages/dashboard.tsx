import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio, Sparkles, FileText, Users, TrendingUp, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface DashboardStats {
  crawlersSessions: number;
  insightsGenerated: number;
  contentApproved: number;
  leadsQualified: number;
  approvalRate: number;
  avgResponseTime: number;
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const kpiCards = [
    {
      title: "Crawl Sessions",
      value: stats?.crawlersSessions || 0,
      icon: Radio,
      description: "Active crawls today",
      trend: "+12%",
    },
    {
      title: "Insights Generated",
      value: stats?.insightsGenerated || 0,
      icon: Sparkles,
      description: "AI-powered analysis",
      trend: "+23%",
    },
    {
      title: "Content Approved",
      value: stats?.contentApproved || 0,
      icon: FileText,
      description: "Ready to publish",
      trend: "+8%",
    },
    {
      title: "Leads Qualified",
      value: stats?.leadsQualified || 0,
      icon: Users,
      description: "High-fit prospects",
      trend: "+15%",
    },
  ];

  const activityData = [
    { time: "00:00", crawls: 12, insights: 4, content: 2 },
    { time: "04:00", crawls: 8, insights: 3, content: 1 },
    { time: "08:00", crawls: 24, insights: 9, content: 5 },
    { time: "12:00", crawls: 32, insights: 12, content: 8 },
    { time: "16:00", crawls: 28, insights: 10, content: 6 },
    { time: "20:00", crawls: 18, insights: 6, content: 3 },
  ];

  const performanceData = [
    { platform: "Reddit", engagement: 85, content: 12 },
    { platform: "YouTube", engagement: 72, content: 8 },
    { platform: "Twitter", engagement: 68, content: 15 },
    { platform: "Blogs", engagement: 91, content: 6 },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Autonomous content intelligence pipeline overview
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi, index) => (
          <Card key={index} data-testid={`card-kpi-${index}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-3xl font-semibold font-mono">{kpi.value}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {kpi.trend}
                    </Badge>
                    <p className="text-xs text-muted-foreground">{kpi.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Activity Timeline</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  System activity over the last 24 hours
                </p>
              </div>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Line type="monotone" dataKey="crawls" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                <Line type="monotone" dataKey="insights" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                <Line type="monotone" dataKey="content" stroke="hsl(var(--chart-3))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Platform Performance</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Engagement scores by content source
                </p>
              </div>
              <BarChart className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
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
                <Bar dataKey="engagement" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <p className="text-sm text-muted-foreground">Latest system events and updates</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { type: "insight", message: "New insight generated for SaaS Marketing topic", time: "2 minutes ago" },
              { type: "content", message: "3 content drafts approved and ready for publishing", time: "15 minutes ago" },
              { type: "crawler", message: "Reddit crawler completed 47 new posts", time: "1 hour ago" },
              { type: "lead", message: "New qualified lead from email campaign", time: "2 hours ago" },
            ].map((activity, index) => (
              <div key={index} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                <div className={`h-2 w-2 rounded-full mt-2 ${
                  activity.type === 'insight' ? 'bg-chart-2' :
                  activity.type === 'content' ? 'bg-chart-1' :
                  activity.type === 'crawler' ? 'bg-chart-4' :
                  'bg-chart-3'
                }`} />
                <div className="flex-1 space-y-1">
                  <p className="text-sm">{activity.message}</p>
                  <p className="text-xs text-muted-foreground font-mono">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
