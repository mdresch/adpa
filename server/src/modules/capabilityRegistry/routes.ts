import { Router } from 'express';
import { CapabilityRegistryController } from './CapabilityRegistryController';
import { RouteConfig } from '../../routes/registry';

const router = Router();
const capabilityRegistry = new CapabilityRegistryController();

/**
 * Modular Capability Registry Routes
 * Mounted under /api/v1/capability-registry — internal, service-to-service only
 * (consumed by the .NET orchestrator's TaskApprovalGate, ADR-005 Phase 2).
 */
router.get('/:moduleId/:portfolioId', capabilityRegistry.getByModuleAndPortfolio);

const capabilityRegistryRoutes: RouteConfig[] = [
  {
    path: '/capability-registry',
    router: router,
    version: '1',
    category: 'CapabilityRegistry'
  }
];

export default capabilityRegistryRoutes;
