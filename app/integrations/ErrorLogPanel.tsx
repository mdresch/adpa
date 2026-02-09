"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, X } from "@/components/ui/icons-shim"

interface RAGError {
    id: string;
    operation_type: string;
    document_id?: string;
    error_message: string;
    error_type: string;
    duration_ms: number;
    created_at: string;
    metadata?: any;
}

interface ErrorLogPanelProps {
    refreshTrigger?: number;
}

export function ErrorLogPanel({ refreshTrigger }: ErrorLogPanelProps) {
    const [errors, setErrors] = useState<RAGError[]>([]);
    const [loading, setLoading] = useState(true);
    const [dismissedErrors, setDismissedErrors] = useState<Set<string>>(new Set());

    const fetchErrors = async () => {
        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
            const response = await fetch(
                `/api/analytics/rag/errors?limit=20&timeRange=168`, // Last 7 days
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (response.ok) {
                const result = await response.json();
                setErrors(result.errors || []);
            }
        } catch (error) {
            console.error('Failed to fetch error logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchErrors();
    }, [refreshTrigger]);

    const handleDismiss = (errorId: string) => {
        setDismissedErrors(prev => new Set(prev).add(errorId));
    };

    const visibleErrors = errors.filter(err => !dismissedErrors.has(err.id));

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return date.toLocaleDateString();
    };

    const getErrorTypeBadge = (type: string) => {
        const colors: Record<string, string> = {
            'VOYAGE_API_ERROR': 'destructive',
            'DATABASE_ERROR': 'destructive',
            'VALIDATION_ERROR': 'secondary',
            'UNKNOWN_ERROR': 'outline'
        };
        return colors[type] || 'outline';
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
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-orange-500" />
                            Recent Errors
                        </CardTitle>
                        <CardDescription>
                            Failed RAG operations in the last 7 days
                        </CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchErrors}
                        className="gap-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {visibleErrors.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        {errors.length === 0 ? '✅ No errors found - all operations successful!' : 'All errors dismissed'}
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {visibleErrors.map((error) => (
                            <div
                                key={error.id}
                                className="p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 space-y-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant="outline" className="capitalize text-xs">
                                                {error.operation_type}
                                            </Badge>
                                            <Badge variant={getErrorTypeBadge(error.error_type) as any} className="text-xs">
                                                {error.error_type.replace(/_/g, ' ')}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {formatTime(error.created_at)}
                                            </span>
                                        </div>

                                        <p className="text-sm text-destructive font-medium truncate" title={error.error_message}>
                                            {error.error_message}
                                        </p>

                                        {error.document_id && (
                                            <p className="text-xs text-muted-foreground font-mono">
                                                Doc: {error.document_id.substring(0, 8)}...
                                            </p>
                                        )}

                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span>Duration: {error.duration_ms}ms</span>
                                        </div>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDismiss(error.id)}
                                        className="h-6 w-6 p-0"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
