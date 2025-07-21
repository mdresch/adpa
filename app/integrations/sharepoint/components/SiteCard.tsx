"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building, ExternalLink, HardDrive, Calendar } from "lucide-react"

interface SharePointSite {
  id: string
  name: string
  displayName: string
  webUrl: string
  description?: string
  createdDateTime: string
  lastModifiedDateTime: string
  siteCollection?: {
    hostname: string
  }
}

interface SiteCardProps {
  site: SharePointSite
  onSelect?: (siteId: string) => void
  onViewDrives?: (siteId: string) => void
  isSelected?: boolean
}

export function SiteCard({ site, onSelect, onViewDrives, isSelected }: SiteCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <Card className={`hover:shadow-md transition-all cursor-pointer ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Building className="h-8 w-8 text-blue-500 mt-1" />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold truncate" title={site.displayName}>
                  {site.displayName}
                </h3>
                <Badge variant="outline" className="ml-2">
                  Site
                </Badge>
              </div>
              
              {site.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {site.description}
                </p>
              )}
              
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Created: {formatDate(site.createdDateTime)}</span>
                </div>
                
                {site.siteCollection?.hostname && (
                  <div className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    <span>{site.siteCollection.hostname}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => window.open(site.webUrl, '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              Open Site
            </Button>
            
            {onViewDrives && (
              <Button 
                variant="secondary" 
                size="sm" 
                className="flex-1"
                onClick={() => onViewDrives(site.id)}
              >
                <HardDrive className="h-3 w-3 mr-2" />
                View Libraries
              </Button>
            )}
            
            {onSelect && (
              <Button 
                size="sm" 
                className="flex-1"
                onClick={() => onSelect(site.id)}
                variant={isSelected ? "default" : "outline"}
              >
                {isSelected ? "Selected" : "Select"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
