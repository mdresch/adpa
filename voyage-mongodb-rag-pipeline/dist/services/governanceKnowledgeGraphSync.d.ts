export interface Project {
    id: string;
    name: string;
    description?: string;
    status: string;
    startDate?: Date;
    endDate?: Date;
    maturityLevel?: number;
    type?: string;
}
export interface Document {
    id: string;
    title: string;
    content: string;
    type: string;
    source: string;
    metadata?: any;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface SemanticUnit {
    id: string;
    content: string;
    type: string;
    confidence?: number;
    metadata?: any;
    entities?: Entity[];
}
export interface Entity {
    id: string;
    name: string;
    type: string;
    confidence?: number;
    metadata?: any;
}
export interface GKGSyncConfig {
    environment: 'development' | 'staging' | 'production';
    batchSize: number;
    retryAttempts: number;
    syncMode: 'bootstrap' | 'incremental' | 'full';
}
export interface SyncResult {
    success: boolean;
    projectsSynced: number;
    documentsSynced: number;
    semanticUnitsSynced: number;
    errors: string[];
    duration: number;
}
export declare class GovernanceKnowledgeGraphSync {
    private neo4jService;
    private supabaseService;
    private config;
    constructor(config: GKGSyncConfig);
    /**
     * Bootstrap GKG with reference nodes and governance domains
     */
    bootstrapGKG(): Promise<boolean>;
    /**
     * Sync all projects to GKG with automatic progression
     */
    syncAllProjects(): Promise<SyncResult>;
    /**
     * Sync individual project to GKG
     */
    syncProjectToGKG(project: Project): Promise<SyncResult>;
    /**
     * Create governance domain reference nodes
     */
    private createGovernanceDomains;
    /**
     * Create maturity level reference nodes
     */
    private createMaturityLevels;
    /**
     * Create entity type reference nodes
     */
    private createEntityTypeReferences;
    /**
     * Create relationship type references
     */
    private createRelationshipReferences;
    /**
     * Create or update project node in Neo4j
     */
    private createProjectNode;
    /**
     * Sync document to GKG
     */
    private syncDocumentToGKG;
    /**
     * Sync semantic unit to GKG
     */
    private syncSemanticUnitToGKG;
    /**
     * Create entity relationships for semantic unit
     */
    private createEntityRelationships;
    /**
     * Create project-level relationships
     */
    private createProjectRelationships;
    /**
     * Get all projects from Supabase
     */
    private getAllProjects;
    /**
     * Get documents for a project from Supabase
     */
    private getProjectDocuments;
    /**
     * Get semantic units for a document from Supabase
     */
    private getDocumentSemanticUnits;
    /**
     * Utility function for delays
     */
    private delay;
}
export declare const gkgSync: GovernanceKnowledgeGraphSync;
//# sourceMappingURL=governanceKnowledgeGraphSync.d.ts.map