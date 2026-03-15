import express from "express";
import { AnalysisController } from "./AnalysisController";
import { authenticateToken, requirePermission } from "../../middleware/auth";
import { RouteConfig } from "../../routes/registry";

const router = express.Router();
const controller = new AnalysisController();

// AI Provider Management
router.get("/providers", authenticateToken, controller.getProviders);
router.post("/providers/:id/toggle", authenticateToken, requirePermission("ai.configure"), controller.toggleProvider);
router.get("/providers/:id/models", authenticateToken, controller.getProviderModels);

// AI Generation
router.post("/generate", authenticateToken, requirePermission("ai.generate"), controller.generate);
router.post("/generate/enhanced", authenticateToken, requirePermission("ai.generate"), controller.enhancedGenerate);

// History
router.get("/history", authenticateToken, controller.getHistory);

// Data Extraction
router.post("/extract", authenticateToken, requirePermission("ai.generate"), controller.extract);
router.get("/status/:jobId", authenticateToken, controller.getJobStatus);
router.get("/summary/:projectId", authenticateToken, controller.getSummary);
router.post("/trigger-baseline", authenticateToken, controller.triggerBaseline);

const analysisRoutes: RouteConfig[] = [
  {
    path: "/analysis",
    router: router,
    version: "1",
    category: "Analysis"
  }
];

export default analysisRoutes;
