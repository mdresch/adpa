/**
 * Knowledge Base Module
 * Entry point for knowledge base functionality
 */

export { knowledgeBaseService } from './service'
export { knowledgeBaseController } from './controller'
import knowledgeBaseRouteConfig from './routes';
export const knowledgeBaseRoutes = knowledgeBaseRouteConfig[0].router;
export * from './types'
export * from './integration'
