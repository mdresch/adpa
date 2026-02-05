import winston from 'winston';
export declare const logger: winston.Logger;
export declare const logDocumentProcessing: (documentId: string, action: string, metadata?: any) => void;
export declare const logEmbeddingGeneration: (batchSize: number, model: string, duration: number) => void;
export declare const logSearchPerformance: (query: string, resultCount: number, duration: number) => void;
export declare const logRAGPerformance: (query: string, totalDuration: number, breakdown: any) => void;
export declare const logError: (error: Error, context?: string, metadata?: any) => void;
export default logger;
//# sourceMappingURL=logger.d.ts.map