"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts"
import { RefreshCw } from "@/components/ui/icons-shim"
import { Button } from "@/components/ui/button"

interface IngestionData {
    hour_bucket: string;
    successful_count: number;
    failed_count: number;
    total_chunks: number;
    total_vectors: number;
}

interface RAGIngestionChartProps {
    integrationId: string | null;
    days?: number;
}

export function RAGIngestionChart({ integrationId, days = 7 }: RAGIngestionChartProps) {
    const [data, setData] = useState<IngestionData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        if (!integrationId) return;

        try {
            setRefreshing(true);
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
            const response = await fetch(
                `/api/analytics/rag/timeseries?days=${days}&operation=ingest`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (response.ok) {
                const result = await response.json();
                // Transform and reverse data (most recent first -> oldest first for chart)
                const transformed = result.data.map((item: IngestionData) => ({
                    ...item,
                    time: new Date(item.hour_bucket).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit'
                    }),
                    total: item.successful_count + item.failed_count
                })).reverse();

                setData(transformed);
            }
        } catch (error) {
            console.error('Failed to fetch ingestion data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [integrationId, days]);

    if (!integrationId) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Document Ingestion Over Time</CardTitle>
                        <CardDescription>
                            Hourly document ingestion activity (last {days} days)
                        </CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchData}
                        disabled={refreshing}
                        className="gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center h-[300px]">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        No ingestion data available
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="time"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                fontSize={12}
                            />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar
                                dataKey="successful_count"
                                fill="#10b981"
                                name="Successful"
                                stackId="a"
                            />
                            <Bar
                                dataKey="failed_count"
                                fill="#ef4444"
                                name="Failed"
                                stackId="a"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
