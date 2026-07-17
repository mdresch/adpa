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
// Governor Portal Approvals queue -- MUST be registered before the generic
// GET /:moduleId/:portfolioId below, or Express would match "overrides"/
// "exceptions" as a literal moduleId and "pending" as a literal portfolioId
// (both are 2-segment GET routes; Express matches in registration order).
router.get('/overrides/pending', authenticateToken, capabilityOverride.listPending);
router.get('/exceptions/pending', authenticateToken, capabilityOverrideException.listPending);

// ADR-012 PR6d: the requester-facing My Requests view -- same 2-segment-before-generic
// ordering requirement as the pending-queue routes above.
router.get('/overrides/mine', authenticateToken, capabilityOverride.listMine);
router.get('/exceptions/mine', authenticateToken, capabilityOverrideException.listMine);

// ADR-012 Action Item 3: the Governor Portal's Capability Register page. A 0-segment
// path, so no ordering conflict with the 2-segment routes above/below it -- grouped
// here anyway since it's the other authenticated, human-facing list route.
router.get('/', authenticateToken, capabilityRegistry.listForUser);

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
// ADR-012 PR6d: requester-initiated, narrower authorization than approve/deny -- see
// CapabilityOverrideController.withdraw's own docs.
router.post('/:moduleId/:portfolioId/override/:requestId/withdraw', authenticateToken, capabilityOverride.withdraw);

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
