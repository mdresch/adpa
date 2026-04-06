import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { Application, Router } from 'express';
import { logger } from '../infrastructure/logger';
interface ModuleExports {
  default: RouteConfig[];
}

/**
 * Interface for modular route configurations.
 * Each module's routes.ts should export an array of these.
 */
export interface RouteConfig {
  path: string;      // e.g., "/projects"
  router: Router;    // Express Router instance
  version: string;   // e.g., "1"
  category: string;  // e.g., "Projects"
}

/**
 * Auto-discovers routes from the src/modules directory.
 * Each module directory is scanned for a 'routes.ts' file.
 * If found, it dynamically imports it and checks if it exports an array of RouteConfig.
 */
export async function discoverRoutes(): Promise<RouteConfig[]> {
  const modulesDir = path.resolve(__dirname, '../modules');
  const routes: RouteConfig[] = [];

  if (!fs.existsSync(modulesDir)) {
    logger.warn('📂 Modules directory not found for auto-discovery');
    return routes;
  }

  const modules = fs.readdirSync(modulesDir);

  for (const moduleName of modules) {
    const routesFileTs = path.join(modulesDir, moduleName, 'routes.ts');
    const routesFileJs = path.join(modulesDir, moduleName, 'routes.js');
    const routesFile = fs.existsSync(routesFileJs) ? routesFileJs : routesFileTs;
    
    if (fs.existsSync(routesFile)) {
      try {
        // Dynamically import the routes file
        // On Windows, absolute paths must be converted to file:// URLs for the ESM loader
        const moduleExports = (await import(pathToFileURL(routesFile).href)) as ModuleExports;
        const moduleRoutes = moduleExports.default || moduleExports;

        // Only add if it's the new RouteConfig array format
        if (Array.isArray(moduleRoutes)) {
          routes.push(...moduleRoutes);
        } else {
          // If it's a single Router (legacy modular style), it will be skipped by auto-discovery
          // and should be registered manually in server.ts if needed.
          logger.debug(`ℹ️ Skipping module ${moduleName}: routes.ts does not export a RouteConfig array.`);
        }
      } catch (err: any) {
        logger.error({ error: err.message }, `❌ Failed to load routes from module: ${moduleName}`);
      }
    }
  }

  return routes;
}

/**
 * Registers all discovered modular routes into the Express application.
 * Prepends /api/v{version} to all routes.
 */
export async function registerRoutes(app: Application) {
  logger.info('🔍 Starting Modular Route Auto-Discovery...');
  
  const newRoutes = await discoverRoutes();
  
  if (newRoutes.length === 0) {
    logger.info('ℹ️ No modular routes found to register via auto-discovery');
    return;
  }

  for (const route of newRoutes) {
    const fullPath = `/api/v${route.version}${route.path}`;
    
    // CRITICAL DEBUG: Verify router is defined before mounting
    if (!route.router) {
      console.error(`❌ ERROR: Module ${route.category} (path: ${fullPath}) has an UNDEFINED router!`);
      logger.error({ category: route.category, path: fullPath }, '❌ Modular route has undefined router');
      continue;
    }

    app.use(fullPath, route.router);
    console.log(`📍 Mounted: [${route.category}] ${fullPath}`);
    logger.info(`📍 Mounted: [${route.category}] ${fullPath}`);
  }
}
