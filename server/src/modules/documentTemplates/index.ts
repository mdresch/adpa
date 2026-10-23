/**
 * Document Templates Module
 * Main entry point for document template management functionality
 */

import { Router } from 'express';
import documentTemplateRouteConfig from './routes';
export const documentTemplateRoutes = documentTemplateRouteConfig[0]?.router || Router();
export { documentTemplateService } from './service'
export { documentTemplateController } from './controller'
export * from './types'
export * from './validation'