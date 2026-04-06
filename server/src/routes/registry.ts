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
    // In production (dist), only .js compiled files exist — never try to import .ts at runtime.
    // In development (ts-node), only .ts files exist.
    // Prefer .js if it exists on disk, otherwise try .ts (dev only).
    const routesFileJs = path.join(modulesDir, moduleName, 'routes.js');
    const routesFileTs = path.join(modulesDir, moduleName, 'routes.ts');
    
    // Only attempt to load a file that physically exists on disk.
    // This prevents "Cannot find module" errors for modules that have a source
    // routes.ts but no compiled routes.js (i.e., modules not yet migrated to modular format).
    const routesFile = fs.existsSync(routesFileJs) 
      ? routesFileJs 
      : (fs.existsSync(routesFileTs) ? routesFileTs : null);
    
    if (!routesFile) {
      // No routes file found for this module — skip silently
      continue;
    }

    try {
      // Dynamically import the routes file.
      // If we're in a CommonJS environment (which the logs suggest), require() is used.
      // require() does NOT support file:// URLs. 
      // ts-node/tsx and modern Node.js handle dynamic import() of absolute paths fine without the file:// prefix on Linux.
      let moduleExports;
      if (typeof require !== 'undefined' && routesFile.endsWith('.js')) {
        // We're in a CommonJS context (likely compiled dist)
        moduleExports = require(routesFile);
      } else {
        // We're in an ESM context or using ts-node/tsx (likely dev)
        // On Windows, absolute paths MUST be file:// URLs for the ESM loader.
        // On Linux/Docker, simple absolute paths are fine.
        const importPath = process.platform === 'win32' 
          ? pathToFileURL(routesFile).href 
          : routesFile;
        moduleExports = await import(importPath);
      }
      
      const moduleRoutes = moduleExports.default || moduleExports;

      // Only add if it's the new RouteConfig array format
      if (Array.isArray(moduleRoutes)) {
        routes.push(...moduleRoutes);
        logger.debug(`✅ Loaded routes from module: ${moduleName}`);
      } else {
        logger.debug(`ℹ️ Skipping module ${moduleName}: routes file does not export a RouteConfig array.`);
      }
    } catch (err: any) {
      logger.error({ error: err.message }, `❌ Failed to load routes from module: ${moduleName}`);
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
