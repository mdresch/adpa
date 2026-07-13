import { Router } from 'express';
import { CapabilityRegistryController } from './CapabilityRegistryController';
import { CapabilityOverrideController } from './CapabilityOverrideController';
import { CapabilityOverrideExceptionController } from './CapabilityOverrideExceptionController';
import { authenticateToken } from '../../middleware/auth';
import { RouteConfig } from '../../routes/registry';

const router = Router();
const capabilityRegistry = new CapabilityRegistryController();
const capabilityOverride = new CapabilityOverrideController();
const capabilityOverrideException = new CapabilityOverrideExceptionController();

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

// ADR-005 Phase 2 task 4: the override path -- a second, DISTINCT active department
// member must approve before promote_capability_status runs with isOverride=true.
// See CapabilityOverrideController's own docs for why this is Node-side, not the
// .NET orchestrator's TaskApprovalGate.
router.post('/:moduleId/:portfolioId/override/request', authenticateToken, capabilityOverride.request);
router.post('/:moduleId/:portfolioId/override/:requestId/approve', authenticateToken, capabilityOverride.approve);
router.post('/:moduleId/:portfolioId/override/:requestId/deny', authenticateToken, capabilityOverride.deny);

// ADR-005 Phase 3 task 6: break-glass structural-deadlock substitute -- see
// CapabilityOverrideExceptionController's own docs.
router.post('/:moduleId/:portfolioId/exceptions/request', authenticateToken, capabilityOverrideException.request);
router.post(
  '/:moduleId/:portfolioId/exceptions/:exceptionId/reviews/:reviewId/decide',
  authenticateToken,
  capabilityOverrideException.decide
);
router.post(
  '/:moduleId/:portfolioId/exceptions/:exceptionId/activate',
  authenticateToken,
  capabilityOverrideException.activate
);

const capabilityRegistryRoutes: RouteConfig[] = [
  {
    path: '/capability-registry',
    router: router,
    version: '1',
    category: 'CapabilityRegistry'
  }
];

export default capabilityRegistryRoutes;
