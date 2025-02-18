
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { Visit } from "@shared/schema";
import { formatDistance } from "date-fns";
import { Button } from "@/components/ui/button";

interface AnalyticsDashboardProps {
  siteId: string;
}

export function AnalyticsDashboard({ siteId }: AnalyticsDashboardProps) {
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const { data: visits = [], isLoading: visitsLoading } = useQuery<Visit[]>({
    queryKey: [`/api/businesses/${siteId}/visits`],
    refetchInterval: 5000
  });

  const handleVisitClick = (visit: Visit) => {
    console.log('Visit clicked:', visit);
    setSelectedVisit(selectedVisit?.id === visit.id ? null : visit);
  };

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: [`/api/businesses/${siteId}/analytics`],
    queryFn: async () => {
      try {
        const resp = await fetch(`/api/businesses/${siteId}/analytics`);
        if (!resp.ok) {
          console.error('Analytics fetch failed:', await resp.text());
          throw new Error('Failed to fetch analytics');
        }
        const data = await resp.json();
        console.log('Fetched analytics:', data);
        return data;
      } catch (error) {
        console.error('Analytics error:', error);
        throw error;
      }
    },
    refetchInterval: 5000
  });

  if (visitsLoading || analyticsLoading) {
    return <div>Loading analytics...</div>;
  }

  // Calculate metrics
  const totalVisits = visits.length;
  const avgDuration = Math.round(
    visits.reduce((sum, v) => sum + (v.duration || 0), 0) / (visits.length || 1)
  );

  // Process page transitions
  const pageTransitions: Record<string, { to: Record<string, number>, timeSpent: number }> = {};
  
  // Find the analytics file for the selected visit
  const visitAnalytics = analytics?.visits?.find((v: any) => v.id === selectedVisit?.id);
  
  if (visitAnalytics?.navigationPath) {
    visitAnalytics.navigationPath.forEach((path: string, i: number, arr: string[]) => {
      if (!pageTransitions[path]) {
        pageTransitions[path] = { to: {}, timeSpent: 0 };
      }
      if (i < arr.length - 1) {
        pageTransitions[path].to[arr[i + 1]] = (pageTransitions[path].to[arr[i + 1]] || 0) + 1;
      }
    });

    // Calculate time spent on each page from visit analytics
    if (visitAnalytics?.pageViews) {
      visitAnalytics.pageViews.forEach((view: any) => {
        if (pageTransitions[view.path]) {
          pageTransitions[view.path].timeSpent += view.timeSpent || 0;
        }
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6 text-3xl font-bold">
              {totalVisits}
              <div className="text-sm text-gray-500">Total Visits</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-3xl font-bold">
              {avgDuration}s
              <div className="text-sm text-gray-500">Average Visit Duration</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Visits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {visits.slice(0, 5).map((visit) => (
                <Button 
                  key={visit.id} 
                  variant={selectedVisit?.id === visit.id ? "secondary" : "ghost"}
                  className="w-full justify-between hover:bg-gray-100 transition-colors"
                  onClick={() => handleVisitClick(visit)}
                >
                  <div className="text-left">
                    <div className="font-medium">
                      {formatDistance(new Date(visit.timestamp), new Date(), { addSuffix: true })}
                    </div>
                    <div className="text-sm text-gray-500">
                      Source: {visit.source} • Duration: {visit.duration}s
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedVisit && analytics && (
          <Card>
            <CardHeader>
              <CardTitle>User Journey Analysis for Visit {selectedVisit.id}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Visit Details</h4>
                  <div className="text-sm text-gray-500 mb-4">
                    Duration: {selectedVisit.duration}s • Source: {selectedVisit.source}
                  </div>
                  <h4 className="font-semibold mb-2">Page Flow</h4>
                  <div className="space-y-2">
                    {Object.entries(pageTransitions).map(([page, data]) => (
                      <div key={page} className="border p-3 rounded">
                        <div className="font-medium">{page}</div>
                        <div className="text-sm text-gray-500">
                          Time spent: {Math.round(data.timeSpent / 1000)}s
                        </div>
                        {Object.entries(data.to).length > 0 && (
                          <div className="mt-2 pl-4 border-l-2">
                            {Object.entries(data.to).map(([nextPage, count]) => (
                              <div key={nextPage} className="text-sm">
                                → {nextPage} ({count} transitions)
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Popular Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.pageViews && Object.entries(analytics.pageViews).map(([path, views]) => (
                <div key={path} className="flex justify-between items-center">
                  <div className="font-medium">{path}</div>
                  <div className="text-sm text-gray-500">{views} views</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
