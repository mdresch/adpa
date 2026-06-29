/**
 * Contract Guards — adpa-doc-gen-queue-health
 *
 * These guards enforce the invariants in
 * docs/superpowers/specs/2026-06-29-doc-gen-queue-consumer-health-design.md
 *
 * They are pure unit tests (no DB, no live RabbitMQ). They MUST be RED before the
 * implementation in server/src/services/queue/queueHealth.ts exists.
 */

import {
  evaluateRabbitHealth,
  evaluateWorkerHealth,
  ensureWorkersRegistered,
  selectStalledPendingJobs,
  PROTECTED_GENERATION_QUEUES,
  MIN_PENDING_REQUEUE_AGE_MS,
  __resetEnsureWorkersForTests,
} from "../../../services/queue/queueHealth";
import { RabbitQueueAdapter } from "../../../services/jobs/queue/RabbitQueueAdapter";

describe("adpa-doc-gen-queue-health — Contract Guards", () => {
  describe("REQ-001: RabbitMQ health reflects the real connection", () => {
    it("reports UNHEALTHY when configured but not connected (the silent-failure that wedges generation)", () => {
      const result = evaluateRabbitHealth({ configured: true, connected: false });
      expect(result.ok).toBe(false);
      expect(result.status).toBe("unhealthy");
      // Instructional: this is exactly the state where jobs sit at 'pending' forever.
      expect(result.reason.toLowerCase()).toContain("not connected");
    });

    it("reports HEALTHY when configured and connected", () => {
      const result = evaluateRabbitHealth({ configured: true, connected: true });
      expect(result.ok).toBe(true);
      expect(result.status).toBe("healthy");
    });

    it("reports HEALTHY (skipped) when RabbitMQ is not configured", () => {
      const result = evaluateRabbitHealth({ configured: false, connected: false });
      expect(result.ok).toBe(true);
      expect(result.status).toBe("healthy");
    });
  });

  describe("REQ-002: Worker health requires a live ai-processing consumer (except role=api)", () => {
    it("role=all is UNHEALTHY when no consumer is attached to ai-processing", () => {
      const result = evaluateWorkerHealth({
        role: "all",
        rabbitConnected: true,
        aiConsumerAttached: false,
      });
      expect(result.ok).toBe(false);
      expect(result.status).toBe("unhealthy");
      expect(result.reason.toLowerCase()).toContain("ai-processing");
    });

    it("role=worker is UNHEALTHY when RabbitMQ is not connected", () => {
      const result = evaluateWorkerHealth({
        role: "worker",
        rabbitConnected: false,
        aiConsumerAttached: false,
      });
      expect(result.ok).toBe(false);
      expect(result.status).toBe("unhealthy");
    });

    it("role=all is HEALTHY when RabbitMQ is connected AND consumer attached", () => {
      const result = evaluateWorkerHealth({
        role: "all",
        rabbitConnected: true,
        aiConsumerAttached: true,
      });
      expect(result.ok).toBe(true);
      expect(result.status).toBe("healthy");
    });

    it("role=api is HEALTHY without any consumer (split invariant: workers run elsewhere)", () => {
      const result = evaluateWorkerHealth({
        role: "api",
        rabbitConnected: false,
        aiConsumerAttached: false,
      });
      expect(result.ok).toBe(true);
      expect(result.status).toBe("healthy");
    });
  });

  describe("REQ-003: Worker registration is deterministic and idempotent", () => {
    beforeEach(() => __resetEnsureWorkersForTests());

    it("invokes registration exactly once across repeated calls when role allows workers", async () => {
      const register = jest.fn();
      const first = await ensureWorkersRegistered({ role: "all", register });
      const second = await ensureWorkersRegistered({ role: "all", register });
      expect(first.invoked).toBe(true);
      expect(second.invoked).toBe(false);
      expect(register).toHaveBeenCalledTimes(1);
    });

    it("never registers consumers when role is api", async () => {
      const register = jest.fn();
      const result = await ensureWorkersRegistered({ role: "api", register });
      expect(result.invoked).toBe(false);
      expect(register).not.toHaveBeenCalled();
    });
  });

  describe("REQ-004: Pending reconciliation selects only stalled, unconsumed generation jobs", () => {
    const now = Date.parse("2026-06-29T12:00:00.000Z");
    const old = new Date(now - 5 * 60_000).toISOString(); // 5 min old
    const recent = new Date(now - 1_000).toISOString(); // 1s old

    it("includes a pending ai-processing job old enough with only a placeholder worker", () => {
      const rows = [
        { id: "j1", status: "pending", queue_name: "ai-processing", worker_id: "worker-pending-123", queued_at: old },
      ];
      const selected = selectStalledPendingJobs(rows, { nowMs: now });
      expect(selected.map((r) => r.id)).toEqual(["j1"]);
    });

    it("includes a pending job with a null worker_id", () => {
      const rows = [
        { id: "j2", status: "pending", queue_name: "document-regeneration", worker_id: null, queued_at: old },
      ];
      const selected = selectStalledPendingJobs(rows, { nowMs: now });
      expect(selected.map((r) => r.id)).toEqual(["j2"]);
    });

    it("EXCLUDES processing jobs (orphan recovery owns those; re-publishing risks duplicates)", () => {
      const rows = [
        { id: "j3", status: "processing", queue_name: "ai-processing", worker_id: null, queued_at: old },
      ];
      expect(selectStalledPendingJobs(rows, { nowMs: now })).toEqual([]);
    });

    it("EXCLUDES recently-queued pending jobs (grace window before requeue)", () => {
      const rows = [
        { id: "j4", status: "pending", queue_name: "ai-processing", worker_id: null, queued_at: recent },
      ];
      expect(selectStalledPendingJobs(rows, { nowMs: now })).toEqual([]);
    });

    it("EXCLUDES non-generation queues", () => {
      const rows = [
        { id: "j5", status: "pending", queue_name: "quality-audit", worker_id: null, queued_at: old },
      ];
      expect(selectStalledPendingJobs(rows, { nowMs: now })).toEqual([]);
    });

    it("EXCLUDES pending jobs already claimed by a real (non-placeholder) worker", () => {
      const rows = [
        { id: "j6", status: "pending", queue_name: "ai-processing", worker_id: "worker-9999-1717", queued_at: old },
      ];
      expect(selectStalledPendingJobs(rows, { nowMs: now })).toEqual([]);
    });

    it("uses a non-zero default minimum age and a known protected-queue set", () => {
      expect(MIN_PENDING_REQUEUE_AGE_MS).toBeGreaterThan(0);
      expect(PROTECTED_GENERATION_QUEUES.has("ai-processing")).toBe(true);
    });
  });

  describe("REQ-005: RabbitQueueAdapter exposes consumer-attachment state", () => {
    function makeFakeConnection() {
      const setups: Array<(ch: any) => any> = [];
      const channel: any = {
        addSetup: (fn: (ch: any) => any) => {
          setups.push(fn);
          return Promise.resolve();
        },
        on: () => {},
        prefetch: async () => {},
        consume: async () => ({ consumerTag: "fake-consumer-tag" }),
        assertQueue: async () => ({}),
        checkQueue: async () => ({ messageCount: 0 }),
        ack: () => {},
        sendToQueue: () => {},
        cancel: async () => {},
        close: async () => {},
      };
      const connection: any = {
        createChannel: () => channel,
        isConnected: () => true,
      };
      return { connection, channel, setups };
    }

    it("is false before a processor is registered, and true once the consumer setup runs", async () => {
      const { connection, channel, setups } = makeFakeConnection();
      const adapter = new RabbitQueueAdapter({ connection, queueName: "ai-processing" });

      expect(adapter.isConsumerAttached()).toBe(false);

      adapter.process("ai-generate", 1, async () => {});
      // Consumer setup is async (runs when RabbitMQ connects) — not yet attached.
      expect(adapter.isConsumerAttached()).toBe(false);

      // Simulate RabbitMQ connecting and running the deferred consumer setup.
      for (const setup of setups) {
        await setup(channel);
      }
      expect(adapter.isConsumerAttached()).toBe(true);
    });
  });
});
