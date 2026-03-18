
import { pool } from './server/src/database/connection';
import documentModuleRoutes from './server/src/modules/documents/routes';

async function test() {
    console.log("Checking documentModuleRoutes...");
    console.log("Type:", typeof documentModuleRoutes);
    console.log("Is Array:", Array.isArray(documentModuleRoutes));
    if (Array.isArray(documentModuleRoutes)) {
        console.log("Length:", documentModuleRoutes.length);
        if (documentModuleRoutes.length > 0) {
            console.log("First element keys:", Object.keys(documentModuleRoutes[0]));
            console.log("Router defined:", !!documentModuleRoutes[0].router);
            if (documentModuleRoutes[0].router) {
                console.log("Router stack length:", (documentModuleRoutes[0].router as any).stack?.length);
                // Check if any stack item has undefined handle
                (documentModuleRoutes[0].router as any).stack?.forEach((layer: any, i: number) => {
                    if (!layer.route && !layer.handle) {
                        console.log(`Layer ${i} is bad (no route and no handle)`);
                    } else if (layer.route) {
                        console.log(`Route ${i} path: ${layer.route.path}`);
                        layer.route.stack.forEach((s: any, j: number) => {
                           if (!s.handle) {
                               console.log(`  Stack item ${j} in route ${i} has NO HANDLE!`);
                           }
                        });
                    }
                });
            }
        }
    }
    process.exit(0);
}

test().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
