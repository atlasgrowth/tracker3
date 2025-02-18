
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { BusinessList } from "@/components/business-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Business } from "@shared/schema";
import { PIPELINE_STAGES } from "@/lib/constants";

const PIPELINES = [
  { id: "arkansas", name: "Arkansas Plumbers" },
  { id: "alabama", name: "Alabama Plumbers" }
];

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedPipeline, setSelectedPipeline] = React.useState<string>(PIPELINES[0].id);
  
  const { data: businesses, isLoading } = useQuery<Business[]>({
    queryKey: ["/api/businesses"]
  });

  const filteredBusinesses = React.useMemo(() => {
    if (!businesses) return [];
    
    let filtered = businesses.filter(b => b.region === selectedPipeline);
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(b => 
        b.name.toLowerCase().includes(search) || 
        b.city?.toLowerCase().includes(search)
      );
    }
    
    return filtered;
  }, [businesses, searchTerm, selectedPipeline]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Pipeline Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group businesses by pipeline stage
  const businessesByStage = filteredBusinesses.reduce((acc, business) => {
    const stage = business.pipelineStage || "website_created";
    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(business);
    return acc;
  }, {} as Record<string, Business[]>);

  return (
    <div className="container mx-auto p-4 space-y-8">
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Pipeline Dashboard
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select Pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINES.map(pipeline => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="search"
                placeholder="Search businesses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-[200px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {Object.entries(PIPELINE_STAGES).map(([key, { label, color }]) => (
              <Card key={key} className="shadow-md">
                <CardHeader className={`${color} text-white`}>
                  <CardTitle className="text-lg font-semibold">{label}</CardTitle>
                  <div className="text-sm opacity-90">
                    {businessesByStage?.[key]?.length || 0} businesses
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {businessesByStage?.[key] && (
                    <BusinessList businesses={businessesByStage[key]} />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
