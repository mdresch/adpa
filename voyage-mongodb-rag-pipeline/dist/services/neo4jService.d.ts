export interface Neo4jConfig {
    uri: string;
    username: string;
    password: string;
    database?: string;
}
export declare class Neo4jService {
    private driver;
    private config;
    constructor(environment: 'development' | 'staging' | 'production');
    private getConfig;
    runQuery(query: string, parameters?: any): Promise<any>;
    runQueryWithTransaction(queries: Array<{
        query: string;
        parameters?: any;
    }>): Promise<any[]>;
    verifyConnection(): Promise<boolean>;
    close(): Promise<void>;
    getProjectGraph(projectId: string): Promise<any>;
    getEntityRelationships(entityId: string): Promise<any>;
    getGovernanceInsights(): Promise<any>;
    getMaturityDistribution(): Promise<any>;
    getEntityTypeDistribution(): Promise<any>;
}
//# sourceMappingURL=neo4jService.d.ts.map