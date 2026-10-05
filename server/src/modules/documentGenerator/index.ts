/**
 * Document Generator Module
 * Main entry point for document generation functionality
 */

import documentGeneratorRouteConfig from './routes';
export const documentGeneratorRoutes = documentGeneratorRouteConfig[0].router;
export { documentGeneratorService } from './service'
export { documentGeneratorController } from './controller'
export * from './types'
export * from './validation'