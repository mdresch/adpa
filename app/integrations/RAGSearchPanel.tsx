"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Loader2, FileText, AlertCircle } from "@/components/ui/icons-shim"

interface SearchResult {
    id: string;
    document_id: string;
    content: string;
    chunk_index: number;
    similarity: number;
    metadata?: {
        title?: string;
        project_id?: string;
        [key: string]: any;
    };
}

export function RAGSearchPanel() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTime, setSearchTime] = useState<number | null>(null);

    const handleSearch = async () => {
        if (!query.trim()) {
            setError("Please enter a search query");
            return;
        }

        setLoading(true);
        setError(null);
        const startTime = Date.now();

        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
            const response = await fetch('/api/rag/query', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: query.trim(),
                    topK: 10
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Search failed');
            }

            const data = await response.json();
            const elapsed = Date.now() - startTime;

            setResults(data.results || []);
            setSearchTime(elapsed);
        } catch (err: any) {
            setError(err.message || 'An error occurred during search');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !loading) {
            handleSearch();
        }
    };

    const getSimilarityColor = (similarity: number) => {
        if (similarity >= 0.8) return "bg-green-500";
        if (similarity >= 0.6) return "bg-yellow-500";
        return "bg-orange-500";
    };

    const getSimilarityLabel = (similarity: number) => {
        if (similarity >= 0.8) return "High";
        if (similarity >= 0.6) return "Medium";
        return "Low";
    };

    return (
        <div className="space-y-4">
            {/* Search Input */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5 text-blue-600" />
                        RAG Vector Search
                    </CardTitle>
                    <CardDescription>
                        Search across all ingested documents using semantic similarity
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Enter your search query..."
                            value={query}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                            onKeyPress={handleKeyPress}
                            disabled={loading}
                            className="flex-1"
                        />
                        <Button
                            onClick={handleSearch}
                            disabled={loading || !query.trim()}
                            className="gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Searching...
                                </>
                            ) : (
                                <>
                                    <Search className="h-4 w-4" />
                                    Search
                                </>
                            )}
                        </Button>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    {searchTime !== null && (
                        <div className="text-sm text-muted-foreground">
                            Found {results.length} result{results.length !== 1 ? 's' : ''} in {searchTime}ms
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Search Results */}
            {results.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Search Results</CardTitle>
                        <CardDescription>
                            Ranked by semantic similarity to your query
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                            {results.map((result, index) => (
                                <div
                                    key={result.id}
                                    className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">
                                                    {result.metadata?.title || `Document ${result.document_id.substring(0, 8)}`}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Chunk {result.chunk_index + 1}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">
                                                #{index + 1}
                                            </Badge>
                                            <div className="flex items-center gap-1">
                                                <div className={`h-2 w-2 rounded-full ${getSimilarityColor(result.similarity)}`} />
                                                <span className="text-xs font-medium">
                                                    {(result.similarity * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                            <Badge
                                                variant={result.similarity >= 0.8 ? "default" : "secondary"}
                                                className="text-xs"
                                            >
                                                {getSimilarityLabel(result.similarity)}
                                            </Badge>
                                        </div>
                                    </div>

                                    <p className="text-sm text-foreground/90 line-clamp-3 mb-3">
                                        {result.content}
                                    </p>

                                    <div className="flex items-center justify-between gap-2 pt-2 border-t">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <span className="text-xs text-muted-foreground">Document ID:</span>
                                            <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded truncate">
                                                {result.document_id}
                                            </code>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(result.document_id);
                                                }}
                                                title="Copy document ID"
                                            >
                                                <span className="text-xs">Copy</span>
                                            </Button>
                                        </div>
                                        {result.metadata?.project_id && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={() => {
                                                    if (result.metadata?.project_id) {
                                                        window.open(
                                                            `/projects/${result.metadata.project_id}/documents/${result.document_id}/view`,
                                                            '_blank'
                                                        );
                                                    }
                                                }}
                                            >
                                                View Document
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Empty State */}
            {!loading && results.length === 0 && searchTime === null && !error && (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No searches yet</p>
                        <p className="text-sm">
                            Enter a query above to search through ingested documents
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
