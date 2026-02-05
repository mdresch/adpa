export interface SupabaseConfig {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
}
export declare class SupabaseService {
    private supabase;
    private config;
    constructor();
    private getConfig;
    /**
     * Get all projects
     */
    getProjects(): Promise<any[]>;
    /**
     * Get documents for a project
     */
    getProjectDocuments(projectId: string): Promise<any[]>;
    /**
     * Get document chunks/semantic units
     */
    getDocumentChunks(documentId: string): Promise<any[]>;
    /**
     * Create semantic units from document chunks
     */
    getDocumentSemanticUnits(documentId: string): Promise<any[]>;
    /**
     * Get a specific project by ID
     */
    getProjectById(projectId: string): Promise<any>;
    /**
     * Test database connection
     */
    testConnection(): Promise<boolean>;
}
//# sourceMappingURL=supabaseService.d.ts.map