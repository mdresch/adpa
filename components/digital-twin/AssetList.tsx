import React from 'react'
import { DigitalTwinAsset } from '@/lib/digital-twin-types'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { formatDistanceToNow } from 'date-fns'

interface AssetListProps {
    assets: DigitalTwinAsset[]
    loading: boolean
}

export function AssetList({ assets, loading }: AssetListProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Asset Registry</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center p-8">
                        <span className="text-muted-foreground">Loading assets...</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Asset Registry</CardTitle>
                <CardDescription>
                    Digital Twin assets extracted from Visio, Azure DT, or iTwin.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {assets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground border border-dashed rounded-md">
                        <p>No assets found.</p>
                        <p className="text-sm">Upload a Visio diagram to get started.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Asset Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Platform</TableHead>
                                <TableHead>State Version</TableHead>
                                <TableHead>Updated</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assets.map((asset) => (
                                <TableRow key={asset.id}>
                                    <TableCell className="font-medium">{asset.name}</TableCell>
                                    <TableCell>{asset.asset_type || 'Unknown'}</TableCell>
                                    <TableCell>
                                        <Badge variant={asset.platform_type === 'Visio' ? 'secondary' : 'outline'}>
                                            {asset.platform_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{asset.current_state_version}</TableCell>
                                    <TableCell>
                                        {asset.updated_at ? formatDistanceToNow(new Date(asset.updated_at), { addSuffix: true }) : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={asset.sync_status === 'active' ? 'default' : 'destructive'}>
                                            {asset.sync_status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}
