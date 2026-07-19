jest.mock("langfuse", () => {
  return {
    Langfuse: jest.fn().mockImplementation(() => {
      return {
        trace: jest.fn().mockReturnValue({
          generation: jest.fn().mockReturnValue({
            update: jest.fn(),
          }),
        }),
      };
    }),
  };
});

jest.mock("puppeteer", () => {
  return {
    launch: jest.fn().mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({
        setContent: jest.fn().mockResolvedValue(undefined),
        pdf: jest.fn().mockResolvedValue(Buffer.from("pdf-data")),
        close: jest.fn().mockResolvedValue(undefined),
      }),
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    }),
  };
}, { virtual: true });

import { getProcessRole, shouldRunWorkers, shouldRunWebServer } from "../../../utils/processRole";
import { pdfService } from "../../../services/pdfService";
import { documentGenerationService } from "../../../services/documentGenerationService";

describe("API / Worker Process Split - Feature Contracts", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("REQ-001: Process Role Configuration", () => {
    it("should default to role 'all' when ADPA_PROCESS_ROLE is not set", () => {
      delete process.env.ADPA_PROCESS_ROLE;
      expect(getProcessRole()).toBe("all");
    });

    it("should recognize role 'api' when explicitly configured", () => {
      process.env.ADPA_PROCESS_ROLE = "api";
      expect(getProcessRole()).toBe("api");
    });

    it("should recognize role 'worker' when explicitly configured", () => {
      process.env.ADPA_PROCESS_ROLE = "worker";
      expect(getProcessRole()).toBe("worker");
    });
  });

  describe("REQ-002 & REQ-003: Role Gating Rules", () => {
    it("should allow workers and server to run when role is 'all'", () => {
      process.env.ADPA_PROCESS_ROLE = "all";
      expect(shouldRunWorkers()).toBe(true);
      expect(shouldRunWebServer()).toBe(true);
    });

    it("should allow web server but block workers when role is 'api'", () => {
      process.env.ADPA_PROCESS_ROLE = "api";
      expect(shouldRunWorkers()).toBe(false);
      expect(shouldRunWebServer()).toBe(true);
    });

    it("should allow workers but block web server when role is 'worker'", () => {
      process.env.ADPA_PROCESS_ROLE = "worker";
      expect(shouldRunWorkers()).toBe(true);
      expect(shouldRunWebServer()).toBe(false);
    });
  });

  describe("REQ-004: Lazy Puppeteer Instantiation & Cleanup", () => {
    it("should not call puppeteer launch on initial load of pdfService", () => {
      const puppeteer = require("puppeteer");
      expect(puppeteer.launch).not.toHaveBeenCalled();
    });

    it("should dynamically import puppeteer and clean up browser process on cleanup", async () => {
      const puppeteer = require("puppeteer");
      // Simulate getting a lazily loaded browser
      const browser = await pdfService.getBrowser();
      expect(browser).toBeDefined();

      expect(puppeteer.launch).toHaveBeenCalled();

      // Verify that browser cleanup function runs without throwing errors
      await expect(pdfService.cleanup()).resolves.not.toThrow();
    });
  });

  // REQ-004 (extended): closes the resident browser after an idle period, since
  // per this feature's own spec the resident Chromium instance was the actual OOM
  // risk on resource-constrained hosts -- launching lazily but never closing it
  // between uses only half-satisfies the requirement. These tests guard the
  // idle-timeout mechanism added to close that gap.
  describe("REQ-004 (extended): idle-based browser auto-close", () => {
    beforeEach(async () => {
      // Singleton state persists across tests in this file -- start each test
      // from a known-clean slate rather than assuming prior tests' state.
      await pdfService.cleanup();
      jest.clearAllMocks();
      jest.useFakeTimers();
    });

    afterEach(async () => {
      jest.useRealTimers();
      await pdfService.cleanup();
    });

    it("does not close the browser before the idle timeout elapses", async () => {
      const puppeteer = require("puppeteer");
      await pdfService.getBrowser();
      const launchedBrowser = await puppeteer.launch.mock.results[0].value;

      jest.advanceTimersByTime(4 * 60 * 1000); // 4 of 5 configured minutes

      expect(launchedBrowser.close).not.toHaveBeenCalled();
    });

    it("closes the browser automatically once nothing has used it for the full idle window", async () => {
      const puppeteer = require("puppeteer");
      await pdfService.getBrowser();
      const launchedBrowser = await puppeteer.launch.mock.results[0].value;

      jest.advanceTimersByTime(5 * 60 * 1000 + 1);
      await Promise.resolve(); // flush the cleanup() microtask the timer callback kicks off

      expect(launchedBrowser.close).toHaveBeenCalledTimes(1);
    });

    it("reschedules the idle timer on reuse instead of closing at the original deadline", async () => {
      const puppeteer = require("puppeteer");
      await pdfService.getBrowser();
      const launchedBrowser = await puppeteer.launch.mock.results[0].value;

      // Touch the browser again just before the original deadline would fire.
      jest.advanceTimersByTime(4 * 60 * 1000);
      await pdfService.getBrowser();
      jest.advanceTimersByTime(4 * 60 * 1000); // 8 minutes total, but only 4 since last use

      expect(launchedBrowser.close).not.toHaveBeenCalled();

      // Now let a full idle window elapse with no further use.
      jest.advanceTimersByTime(60 * 1000 + 1);
      await Promise.resolve();

      expect(launchedBrowser.close).toHaveBeenCalledTimes(1);
    });

    it("explicit cleanup() clears the pending idle timer so it does not fire again later", async () => {
      const puppeteer = require("puppeteer");
      await pdfService.getBrowser();
      const launchedBrowser = await puppeteer.launch.mock.results[0].value;

      await pdfService.cleanup();
      expect(launchedBrowser.close).toHaveBeenCalledTimes(1);

      // Advancing time past where the original idle timer would have fired must
      // not trigger a second close call -- cleanup() should have cleared it.
      jest.advanceTimersByTime(6 * 60 * 1000);
      await Promise.resolve();

      expect(launchedBrowser.close).toHaveBeenCalledTimes(1);
    });

    it("launches a fresh browser on the next request after an idle close", async () => {
      const puppeteer = require("puppeteer");
      await pdfService.getBrowser();
      expect(puppeteer.launch).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(5 * 60 * 1000 + 1);
      await Promise.resolve();

      await pdfService.getBrowser();
      expect(puppeteer.launch).toHaveBeenCalledTimes(2);
    });
  });

  describe("REQ-005 & REQ-006: Telemetry and LLM Insights Gating", () => {
    it("should gate writing LLM prompt and response blobs to Postgres jobs table based on LLM_INSIGHTS_STORE_BLOBS", async () => {
      process.env.LLM_INSIGHTS_STORE_BLOBS = "false";
      
      const payload = {
        phase: "drafting" as const,
        label: "Section 1",
        traceName: "generation",
        provider: "google",
        model: "gemini-1.5-flash",
        temperature: 0.7,
        prompt: "A very long LLM prompt...",
        response: "A very long LLM response..."
      };
      
      const slimmedRecord = await documentGenerationService.recordLLMPromptSnapshot("test-job", payload);
      
      // Prompt and response text should not be in the slimmed database record
      expect(slimmedRecord).toBeDefined();
      expect(slimmedRecord!.prompt).toBeUndefined();
      expect(slimmedRecord!.response).toBeUndefined();
      expect(slimmedRecord!.phase).toBe("drafting");
    });

    it("should save full prompt and response blobs if LLM_INSIGHTS_STORE_BLOBS is set to true", async () => {
      process.env.LLM_INSIGHTS_STORE_BLOBS = "true";
      
      const payload = {
        phase: "drafting" as const,
        label: "Section 1",
        traceName: "generation",
        provider: "google",
        model: "gemini-1.5-flash",
        temperature: 0.7,
        prompt: "A very long LLM prompt...",
        response: "A very long LLM response..."
      };
      
      const savedRecord = await documentGenerationService.recordLLMPromptSnapshot("test-job", payload);
      
      expect(savedRecord).toBeDefined();
      expect(savedRecord!.prompt).toBe("A very long LLM prompt...");
      expect(savedRecord!.response).toBe("A very long LLM response...");
    });
  });
});
