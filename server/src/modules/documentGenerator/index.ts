/**
 * Document Generator Module
 * Main entry point for document generation functionality
 */

import { Router } from 'express';
import documentGeneratorRouteConfig from './routes';
export const documentGeneratorRoutes = documentGeneratorRouteConfig[0]?.router || Router();
export { documentGeneratorService } from './service'
export { documentGeneratorController } from './controller'
export * from './types'
export * from './validation'