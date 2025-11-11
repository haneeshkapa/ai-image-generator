import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, Calendar, ExternalLink, CheckCircle, Clock, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Lead } from "@shared/schema";

export default function Leads() {
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest("PATCH", `/api/leads/${id}`, { qualificationStatus: status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead updated",
        description: "Lead status changed successfully",
      });
    },
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "default",
      qualified: "secondary",
      contacted: "outline",
      booked: "default",
    };
    return colors[status] || "outline";
  };

  const getIcpScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-500";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-500";
    return "text-muted-foreground";
  };

  const filteredLeads = leads?.filter(lead =>
    statusFilter === "all" || lead.qualificationStatus === statusFilter
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Leads</h1>
          <p className="text-muted-foreground">
            Track and manage prospects from high-engagement content
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Leads</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold font-mono">{leads?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Qualified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold font-mono text-blue-600 dark:text-blue-500">
              {leads?.filter(l => l.qualificationStatus === "qualified").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Contacted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold font-mono text-yellow-600 dark:text-yellow-500">
              {leads?.filter(l => l.qualificationStatus === "contacted").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Booked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold font-mono text-green-600 dark:text-green-500">
              {leads?.filter(l => l.qualificationStatus === "booked").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : filteredLeads && filteredLeads.length > 0 ? (
        <div className="space-y-4">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} data-testid={`card-lead-${lead.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-lg">{lead.name || "Unknown"}</CardTitle>
                      <Badge variant={getStatusColor(lead.qualificationStatus) as any}>
                        {lead.qualificationStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {lead.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </span>
                      )}
                      {lead.source && (
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-primary" />
                          From {lead.source}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground mb-1">ICP Score</div>
                      <div className={`text-2xl font-semibold font-mono ${getIcpScoreColor(lead.icpScore)}`}>
                        {lead.icpScore}
                        <span className="text-sm text-muted-foreground">/100</span>
                      </div>
                    </div>
                    {lead.icpScore >= 70 && (
                      <Target className="h-8 w-8 text-green-500" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-xs text-muted-foreground font-mono">
                    {lead.hubspotContactId && (
                      <span className="flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        HubSpot ID: {lead.hubspotContactId.substring(0, 8)}...
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Created {new Date(lead.createdAt).toLocaleDateString()}
                    </span>
                    {lead.contactedAt && (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Contacted {new Date(lead.contactedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {lead.qualificationStatus === "new" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: lead.id, status: "qualified" })}
                        disabled={updateStatusMutation.isPending}
                        data-testid={`button-qualify-${lead.id}`}
                      >
                        Mark Qualified
                      </Button>
                    )}
                    {lead.qualificationStatus === "qualified" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: lead.id, status: "contacted" })}
                        disabled={updateStatusMutation.isPending}
                        data-testid={`button-contact-${lead.id}`}
                      >
                        Mark Contacted
                      </Button>
                    )}
                    {lead.qualificationStatus === "contacted" && (
                      <Button
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: lead.id, status: "booked" })}
                        disabled={updateStatusMutation.isPending}
                        data-testid={`button-book-${lead.id}`}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Mark Booked
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`button-view-hubspot-${lead.id}`}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View in HubSpot
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No leads yet</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
              Leads will automatically be created when content generates high engagement and matches your ICP
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
