import { Router } from 'express';
import { CapabilityRegistryController } from './CapabilityRegistryController';
import { authenticateToken } from '../../middleware/auth';
import { RouteConfig } from '../../routes/registry';

const router = Router();
const capabilityRegistry = new CapabilityRegistryController();

/**
 * Modular Capability Registry Routes
 * Mounted under /api/v1/capability-registry
 */
// Internal, service-to-service only (consumed by the .NET orchestrator's TaskApprovalGate,
// ADR-005 Phase 2) — deliberately unauthenticated, see CapabilityRegistryController's own docs.
router.get('/:moduleId/:portfolioId', capabilityRegistry.getByModuleAndPortfolio);

// ADR-005 Phase 6: the first human-triggerable activation-status transition endpoint.
// Authenticated; department-membership/admin authorization enforced inside the controller
// (needs the target capability's functional_owner_department, resolved after auth, not a
// static route-level role list).
router.post('/:moduleId/:portfolioId/promote', authenticateToken, capabilityRegistry.promote);

const capabilityRegistryRoutes: RouteConfig[] = [
  {
    path: '/capability-registry',
    router: router,
    version: '1',
    category: 'CapabilityRegistry'
  }
];

export default capabilityRegistryRoutes;
