import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PipelineStage } from "@/components/pipeline-stage";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { WebhookCode } from "@/components/webhook-code";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Home, ChevronRight, ArrowLeft } from "lucide-react";
import type { Business, PipelineStage as PipelineStageType } from "@shared/schema";
import { PIPELINE_STAGES } from "@/lib/constants";

export default function BusinessDetails() {
  const { siteId } = useParams();
  const { toast } = useToast();

  const { data: business, isLoading } = useQuery<Business>({
    queryKey: [`/api/businesses/${siteId}`]
  });

  const updateStage = useMutation({
    mutationFn: async (stage: PipelineStageType) => {
      await apiRequest("PATCH", `/api/businesses/${siteId}/stage`, { stage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${siteId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      toast({
        title: "Success",
        description: "Pipeline stage updated"
      });
    }
  });

  const updateNotes = useMutation({
    mutationFn: async (notes: string) => {
      await apiRequest("PATCH", `/api/businesses/${siteId}/notes`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${siteId}`] });
      toast({
        title: "Success",
        description: "Notes updated"
      });
    }
  });

  if (isLoading || !business) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Link className="flex items-center gap-1 hover:text-gray-900" href="/">
            <Home className="h-4 w-4" />
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span>{business.name}</span>
        </div>
        <Link href="/">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              {business.name}
            </CardTitle>
            <WebhookCode businessId={business.siteId} />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Pipeline Stage</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <PipelineStage stage={business.pipelineStage || "website_created"} />
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(PIPELINE_STAGES).map(([stage, { label, color }]) => (
                      stage !== business.pipelineStage && (
                        <Button
                          key={stage}
                          size="sm"
                          onClick={() => updateStage.mutate(stage as PipelineStageType)}
                          disabled={updateStage.isPending}
                          className={`${color} hover:opacity-90 text-white`}
                        >
                          Move to {label}
                        </Button>
                      )
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Business Details</h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Rating</p>
                    <p className="font-medium">{business.rating || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Reviews</p>
                    <p className="font-medium">{business.totalReviews || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Has Website</p>
                    <p className="font-medium">{business.hasWebsite ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Has Facebook</p>
                    <p className="font-medium">{business.hasFacebook ? "Yes" : "No"}</p>
                  </div>
                  {business.ownerName && (
                    <div>
                      <p className="text-sm text-gray-600">Owner Name</p>
                      <p className="font-medium">{business.ownerName}</p>
                    </div>
                  )}
                  {business.phone && (
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">
                        <a href={`tel:${business.phone}`} className="text-blue-600 hover:underline">{business.phone}</a>
                        <a href={`sms:${business.phone}`} className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200">
                          Text
                        </a>
                      </p>
                    </div>
                  )}
                </div>
                {business.introduction && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Introduction</p>
                    <p className="text-sm">{business.introduction}</p>
                  </div>
                )}
                {business.reviewLink && (
                  <div className="mt-4">
                    <a href={business.reviewLink} target="_blank" rel="noopener noreferrer" 
                       className="text-sm text-blue-600 hover:underline">
                      Leave a Review
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Notes</h3>
              <Textarea
                value={business.notes || ""}
                onChange={(e) => updateNotes.mutate(e.target.value)}
                placeholder="Add notes about this business, communication history, follow-ups..."
                className="min-h-[200px] bg-gray-50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <AnalyticsDashboard businessId={business.id} siteId={business.siteId} />
    </div>
  );
}