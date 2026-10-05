/**
 * Document Templates Module
 * Main entry point for document template management functionality
 */

import documentTemplateRouteConfig from './routes';
export const documentTemplateRoutes = documentTemplateRouteConfig[0].router;
export { documentTemplateService } from './service'
export { documentTemplateController } from './controller'
export * from './types'
export * from './validation'