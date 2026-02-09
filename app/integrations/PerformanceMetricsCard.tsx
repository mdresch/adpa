"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw } from "@/components/ui/icons-shim"

interface PerformanceMetric {
    operation_type: string;
    total_operations: number;
    avg_latency_ms: number;
    min_latency_ms: number;
    max_latency_ms: number;
    p50_latency_ms: number;
    p95_latency_ms: number;
    p99_latency_ms: number;
    success_count: number;
    failure_count: number;
    success_rate: number;
    throughput_ops_per_minute: number;
}

interface PerformanceMetricsCardProps {
    refreshTrigger?: number;
}

export function PerformanceMetricsCard({ refreshTrigger }: PerformanceMetricsCardProps) {
    const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRange] = useState(24); // hours

    const fetchMetrics = async () => {
        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
            const response = await fetch(
                `/api/analytics/rag/performance?timeRange=${timeRange}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (response.ok) {
                const result = await response.json();
                setMetrics(result.metrics || []);
            }
        } catch (error) {
            console.error('Failed to fetch performance metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
    }, [timeRange, refreshTrigger]);

    const formatLatency = (ms: number) => {
        if (ms < 1000) return `${Math.round(ms)}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    const getTrendBadge = (rate: number) => {
        if (rate >= 95) return <Badge variant="default" className="text-xs">Excellent</Badge>;
        if (rate >= 85) return <Badge variant="secondary" className="text-xs">Good</Badge>;
        return <Badge variant="destructive" className="text-xs">Poor</Badge>;
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="py-10">
                    <div className="flex items-center justify-center">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {metrics.map((metric) => (
                <Card key={metric.operation_type}>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium capitalize">
                                {metric.operation_type} Performance
                            </CardTitle>
                            {getTrendBadge(metric.success_rate)}
                        </div>
                        <CardDescription>Last {timeRange}h</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Avg Latency</span>
                                <span className="font-bold">{formatLatency(metric.avg_latency_ms)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>P95: {formatLatency(metric.p95_latency_ms)}</span>
                                <span>P99: {formatLatency(metric.p99_latency_ms)}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Success Rate</span>
                            <Badge
                                variant={metric.success_rate >= 95 ? "default" : metric.success_rate >= 85 ? "secondary" : "destructive"}
                            >
                                {metric.success_rate.toFixed(1)}%
                            </Badge>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Throughput</span>
                            <span className="font-medium">{metric.throughput_ops_per_minute.toFixed(1)} ops/min</span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                            <span>{metric.total_operations.toLocaleString()} total ops</span>
                            <span className="text-red-500">{metric.failure_count} failed</span>
                        </div>
                    </CardContent>
                </Card>
            ))}

            {metrics.length === 0 && (
                <Card className="col-span-full">
                    <CardContent className="py-10 text-center text-muted-foreground">
                        No performance metrics available for the selected time range
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
