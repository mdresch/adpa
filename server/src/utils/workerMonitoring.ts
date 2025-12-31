import { pool } from '../database/connection';
import { logger } from './logger';
import { safeUpdate } from '../services/jobs/dbGuards';

/**
 * Worker Monitoring Utility
 * Collects and reports process-level resource usage (CPU/Memory)
 */
export class WorkerMonitoring {
    private static interval: NodeJS.Timeout | null = null;
    private static lastCpuUsage: NodeJS.CpuUsage | null = null;
    private static lastCheckTime: number = 0;

    /**
     * Start periodic resource reporting for a worker
     */
    static start(workerId: string, queueName: string) {
        if (this.interval) {
            this.stop();
        }

        this.lastCpuUsage = process.cpuUsage();
        this.lastCheckTime = Date.now();

        // Report every 15 seconds to balance overhead and freshness
        this.interval = setInterval(async () => {
            try {
                const stats = await this.collectStats();

                                await safeUpdate(pool,
                    `INSERT INTO worker_heartbeats (
            worker_id, 
            worker_process_id, 
            queue_name, 
            cpu_usage_percent, 
            memory_usage_mb, 
            last_heartbeat
          ) VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (worker_id) DO UPDATE SET
            cpu_usage_percent = EXCLUDED.cpu_usage_percent,
            memory_usage_mb = EXCLUDED.memory_usage_mb,
            last_heartbeat = NOW()`,
                    [
                        workerId,
                        process.pid,
                        queueName,
                        stats.cpuPercent,
                        stats.memoryMB
                    ]
                                );
            } catch (error) {
                logger.error('Failed to report worker heartbeat:', error);
            }
        }, 15000);

        // Initial report
        this.reportInitial(workerId, queueName);
    }

    /**
     * Stop periodic reporting
     */
    static stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    /**
     * Collect current process statistics
     */
    private static async collectStats() {
        // Memory usage
        const memoryUsage = process.memoryUsage();
        const memoryMB = Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100;

        // CPU usage calculation
        const currentCpuUsage = process.cpuUsage();
        const currentTime = Date.now();

        let cpuPercent = 0;
        if (this.lastCpuUsage) {
            const userDiff = currentCpuUsage.user - this.lastCpuUsage.user;
            const systemDiff = currentCpuUsage.system - this.lastCpuUsage.system;
            const timeDiffMs = currentTime - this.lastCheckTime;

            // Total CPU time in microseconds
            const totalCpuMicros = userDiff + systemDiff;
            // Total wall clock time in microseconds
            const totalWallMicros = timeDiffMs * 1000;

            // Calculate percentage (can be > 100% on multi-core, but we'll cap it at 100 per process logic)
            cpuPercent = Math.min(100, Math.round((totalCpuMicros / totalWallMicros) * 100));
        }

        this.lastCpuUsage = currentCpuUsage;
        this.lastCheckTime = currentTime;

        return {
            memoryMB,
            cpuPercent
        };
    }

    /**
     * Perform initial report immediately
     */
    private static async reportInitial(workerId: string, queueName: string) {
        try {
            const memoryUsage = process.memoryUsage();
            const memoryMB = Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100;

                        await safeUpdate(pool,
                `INSERT INTO worker_heartbeats (
          worker_id, 
          worker_process_id, 
          queue_name, 
          cpu_usage_percent, 
          memory_usage_mb, 
          last_heartbeat
        ) VALUES ($1, $2, $3, 0, $4, NOW())
        ON CONFLICT (worker_id) DO UPDATE SET
          last_heartbeat = NOW()`,
                [workerId, process.pid, queueName, memoryMB]
                        );
        } catch (error) {
            // Silent fail for initial report
        }
    }
}
