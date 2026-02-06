import { logger } from "../utils/logger"

export interface ProjectWiseConfig {
    baseUrl: string
    clientId: string
    clientSecret: string
    scope: string
}

export interface ProjectWiseFolder {
    id: string
    name: string
    path: string
    projectId: string
}

export interface ProjectWiseDocument {
    id: string
    name: string
    folderId: string
    size: number
    version: string
    webUrl: string
    lastModified: string
}

/**
 * Mock Service for Bentley ProjectWise
 * Simulates enterprise document management for infrastructure projects.
 */
export class ProjectWiseService {
    private static instance: ProjectWiseService
    private config: ProjectWiseConfig | null = null

    private constructor() { }

    public static getInstance(): ProjectWiseService {
        if (!ProjectWiseService.instance) {
            ProjectWiseService.instance = new ProjectWiseService()
        }
        return ProjectWiseService.instance
    }

    async initialize(config: ProjectWiseConfig): Promise<void> {
        this.config = config
        logger.info("[PROJECTWISE-SERVICE] Initialized with config", { baseUrl: config.baseUrl })
    }

    /**
     * Simulates uploading a document to ProjectWise
     */
    async uploadDocument(
        projectId: string,
        folderPath: string,
        fileName: string,
        content: string | Buffer
    ): Promise<ProjectWiseDocument> {
        logger.info(`[PROJECTWISE-SERVICE] Uploading ${fileName} to ${folderPath} in project ${projectId}`)

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800))

        const mockDoc: ProjectWiseDocument = {
            id: `pw-doc-${Math.random().toString(36).substr(2, 9)}`,
            name: fileName,
            folderId: `pw-folder-${Math.random().toString(36).substr(2, 9)}`,
            size: typeof content === 'string' ? content.length : content.byteLength,
            version: "1.0",
            webUrl: `https://projectwise.bentley.com/p/${projectId}/d/${fileName}`,
            lastModified: new Date().toISOString()
        }

        logger.info(`[PROJECTWISE-SERVICE] Successfully archived to ProjectWise: ${mockDoc.id}`)
        return mockDoc
    }

    /**
     * Simulates creating a folder hierarchy in ProjectWise
     */
    async ensureFolder(projectId: string, path: string): Promise<ProjectWiseFolder> {
        logger.info(`[PROJECTWISE-SERVICE] Ensuring folder path exists: ${path}`)

        return {
            id: `pw-folder-${Math.random().toString(36).substr(2, 9)}`,
            name: path.split('/').pop() || path,
            path: path,
            projectId: projectId
        }
    }

    /**
     * Simulates fetching project documents
     */
    async getDocuments(projectId: string): Promise<ProjectWiseDocument[]> {
        return [
            {
                id: "pw-doc-001",
                name: "Baseline_Safety_Plan.pdf",
                folderId: "pw-f-101",
                size: 102456,
                version: "2.1",
                webUrl: "https://projectwise.bentley.com/d/001",
                lastModified: new Date().toISOString()
            }
        ]
    }
}

export const projectWiseService = ProjectWiseService.getInstance()
