import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Star, MessageSquare, Phone } from "lucide-react";
import type { Business } from "@shared/schema";

interface BusinessListProps {
  businesses: Business[];
}

export function BusinessList({ businesses }: BusinessListProps) {
  return (
    <div className="space-y-4">
      {businesses.map((business) => (
        <Link key={business.siteId} href={`/business/${business.siteId}`}>
          <Card className="cursor-pointer hover:border-blue-500 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <h3 className="font-medium">{business.name}</h3>
                    {business.region && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {business.region}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    {business.ownerName && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Owner:</span> {business.ownerName}
                      </div>
                    )}
                    {business.city && (
                      <div>{business.city}</div>
                    )}
                    {business.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <a 
                          href={`tel:${business.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:underline"
                        >
                          {business.phone}
                        </a>
                        <a 
                          href={`sms:${business.phone}${business.introduction ? `?&body=${encodeURIComponent(business.introduction)}` : ''}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200"
                        >
                          Text
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {business.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm">{business.rating}</span>
                    </div>
                  )}
                  {business.notes && (
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}