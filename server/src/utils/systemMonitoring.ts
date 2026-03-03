import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger';
import { safeQuery, isDatabaseReady } from '../database/helpers';

const execPromise = promisify(exec);

/**
 * System Monitoring Utility
 * Collects system-wide resource metrics and stores them in the database
 */
export class SystemMonitoring {
    private static lastCpuUsage = process.cpuUsage();
    private static lastCheck = Date.now();
    private static lastNetworkStats: { bytesReceived: number; bytesSent: number; time: number } | null = null;
    private static interval: NodeJS.Timeout | null = null;

    /**
     * Start periodic system-wide monitoring (alias for startMonitoring)
     */
    static start(intervalMs: number = 60000): void {
        this.startMonitoring(intervalMs);
    }

    /**
     * Start periodic system-wide monitoring
     */
    static startMonitoring(intervalMs: number = 60000): NodeJS.Timeout {
        logger.info('✅ System and worker resource monitoring started');
        
        this.interval = setInterval(async () => {
            await this.collectAndStore();
        }, intervalMs);
        
        return this.interval;
    }

    /**
     * Collect and store metrics in the database
     */
    static async collectAndStore(): Promise<void> {
        try {
            // Skip if database not ready
            if (!isDatabaseReady()) {
                logger.debug('[METRICS] Database not ready, skipping metrics storage')
                return
            }

            const metrics = await this.collectMetrics()
            
            // Insert metrics following actual schema from system_metrics table:
            // Columns: id (auto), cpu_usage_percent, memory_usage_percent, 
            //          disk_usage_percent, network_usage_percent, recorded_at (auto)
            await safeQuery(
                `INSERT INTO system_metrics (
                  cpu_usage_percent,
                  memory_usage_percent,
                  disk_usage_percent,
                  network_usage_percent
                 ) VALUES ($1, $2, $3, $4)`,
                [
                    metrics.cpu,
                    metrics.memory,
                    metrics.disk,
                    0 // network_usage_percent - collect if needed in future
                ]
            )
        } catch (error: any) {
            // Don't throw - metrics collection failures shouldn't break main flow
            logger.debug('[METRICS] Failed to store system metrics', { 
                error: error?.message 
            })
        }
    }

    /**
     * Stop monitoring
     */
    static stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            logger.info('🛑 System monitoring stopped');
        }
    }

    /**
     * Collect all system metrics
     */
    private static async collectAllMetrics() {
        const cpu = await this.getAverageCpuUsage();
        const memory = await this.getMemoryUsage();
        const disk = await this.getDiskUsage();
        const network = await this.getNetworkUsage();

        return { cpu, memory, disk, network };
    }

    /**
     * Get average CPU usage across all cores
     */
    private static async getAverageCpuUsage(): Promise<number> {
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;

        cpus.forEach(core => {
            for (const type in core.times) {
                totalTick += (core.times as any)[type];
            }
            totalIdle += core.times.idle;
        });

        // This requires two samples, so we'll use os.loadavg as a quick fallback or calculate diff
        // For simplicity and immediate response, we'll use loadavg if on Unix, or calculate for Windows
        if (os.platform() !== 'win32') {
            const load = os.loadavg()[0];
            const cores = os.cpus().length;
            return Math.min(100, Math.round((load / cores) * 100));
        }

        // On Windows, loadavg is always [0, 0, 0]. We'll use a simple approximation for now or 
        // rely on the interval diff in a more complex implementation.
        // Let's use a 500ms sample for CPU if it's the first time
        return new Promise((resolve) => {
            const startMeasure = this.cpuAverage();
            setTimeout(() => {
                const endMeasure = this.cpuAverage();
                const idleDiff = endMeasure.idle - startMeasure.idle;
                const totalDiff = endMeasure.total - startMeasure.total;
                const percentage = 100 - Math.round((100 * idleDiff) / totalDiff);
                resolve(percentage);
            }, 500);
        });
    }

    private static cpuAverage() {
        let totalIdle = 0;
        let totalTick = 0;
        const cpus = os.cpus();

        cpus.forEach(core => {
            for (const type in core.times) {
                totalTick += (core.times as any)[type];
            }
            totalIdle += core.times.idle;
        });

        return { idle: totalIdle, total: totalTick };
    }

    /**
     * Get memory usage percentage
     */
    private static async getMemoryUsage(): Promise<number> {
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;
        return Math.round((used / total) * 100);
    }

    /**
     * Get primary disk usage percentage
     */
    private static async getDiskUsage(): Promise<number> {
        try {
            if (os.platform() === 'win32') {
                const { stdout } = await execPromise('powershell "Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DeviceID -eq \'C:\' } | Select-Object @{Name=\'UsedPercent\';Expression={ [math]::Round((($_.Size - $_.FreeSpace) / $_.Size) * 100) }}"');
                const match = stdout.match(/UsedPercent\s+(\d+)/);
                if (match) return parseInt(match[1]);
            } else {
                // Linux/Vercel fallback
                const { stdout } = await execPromise("df / | tail -1 | awk '{print $5}'");
                return parseInt(stdout.replace('%', '')) || 0;
            }
        } catch (error) {
            // Silently fail or log if it looks like a real error
            if (os.platform() !== 'win32') {
                logger.debug('SystemMonitoring: Disk usage collection failed (possibly restricted environment)');
            } else {
                logger.error('Failed to get disk usage:', error);
            }
        }
        return 0;
    }

    /**
     * Get network activity percentage
     */
    private static async getNetworkUsage(): Promise<number> {
        try {
            if (os.platform() === 'win32') {
                const { stdout } = await execPromise('powershell "(Get-NetAdapterStatistics | Measure-Object -Property ReceivedBytes, SentBytes -Sum).Sum"');
                const totalBytes = parseInt(stdout.trim());
                const currentTime = Date.now();

                if (this.lastNetworkStats) {
                    const bytesDiff = Math.max(0, totalBytes - this.lastNetworkStats.bytesReceived);
                    const timeDiff = (currentTime - this.lastNetworkStats.time) / 1000;

                    if (timeDiff <= 0) return 0;

                    const bps = bytesDiff / timeDiff;
                    const maxBps = 125 * 1024 * 1024; // 1Gbps
                    const percentage = Math.min(100, Math.round((bps / maxBps) * 100));

                    this.lastNetworkStats = { bytesReceived: totalBytes, bytesSent: 0, time: currentTime };
                    return isNaN(percentage) ? 0 : percentage;
                }

                this.lastNetworkStats = { bytesReceived: totalBytes, bytesSent: 0, time: currentTime };
            } else {
                // Linux/Vercel fallback - usually /proc/net/dev is available but might have different interface names
                const { stdout } = await execPromise("grep -E 'eth0|enp|wlan' /proc/net/dev | awk '{print $2+$10}' | head -1");
                const totalBytes = parseInt(stdout.trim());
                if (isNaN(totalBytes)) return 0;

                const currentTime = Date.now();
                if (this.lastNetworkStats) {
                    const bytesDiff = Math.max(0, totalBytes - this.lastNetworkStats.bytesReceived);
                    const timeDiff = (currentTime - this.lastNetworkStats.time) / 1000;
                    if (timeDiff <= 0) return 0;

                    const bps = bytesDiff / timeDiff;
                    const maxBps = 125 * 1024 * 1024; // 1Gbps assumption
                    const percentage = Math.min(100, Math.round((bps / maxBps) * 100));
                    this.lastNetworkStats = { bytesReceived: totalBytes, bytesSent: 0, time: currentTime };
                    return isNaN(percentage) ? 0 : percentage;
                }
                this.lastNetworkStats = { bytesReceived: totalBytes, bytesSent: 0, time: currentTime };
            }
        } catch (error) {
            // Silently fail on network collection as it's often restricted or has different interface names
            logger.debug('SystemMonitoring: Network usage collection failed');
        }
        return 0;
    }

    private static async collectMetrics() {
        const cpu = await this.getAverageCpuUsage();
        const memory = await this.getMemoryUsage();
        const disk = await this.getDiskUsage();
        const network = await this.getNetworkUsage();

        return { cpu, memory, disk, network, timestamp: new Date(), connections: 0 };
    }
}
