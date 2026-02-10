import InfluxDBService from './influxdbService'
import { logger } from '../utils/logger'

export interface DistributionItem {
    entity_type: string
    count: number
}

export interface TrendItem {
    time: string
    count: number
}

export interface OverviewStats {
    totalExtractions: number
    totalPersisted: number
    successRate: number
    mostActiveEntity: string
}

export class ExtractionAnalyticsService {
    /**
     * Get overview stats for extraction
     */
    static async getOverviewStats(period: string = '30d'): Promise<OverviewStats> {
        try {
            // Total Extractions (operation = 'extract')
            const extractQuery = `
        SELECT count(count) as total
        FROM entity_operations
        WHERE operation = 'extract'
          AND time >= now() - ${this.periodToInterval(period)}
      `

            // Total Persisted (operation = 'create')
            const persistQuery = `
        SELECT count(count) as total
        FROM entity_operations
        WHERE operation = 'create'
          AND time >= now() - ${this.periodToInterval(period)}
      `

            // Success Rate
            const successQuery = `
        SELECT count(count) as total
        FROM entity_operations
        WHERE operation = 'extract'
          AND success = 'true'
          AND time >= now() - ${this.periodToInterval(period)}
      `

            // Most Active Entity
            const entityActivityQuery = `
        SELECT count(count) as total
        FROM entity_operations
        WHERE time >= now() - ${this.periodToInterval(period)}
        GROUP BY entity_type
        ORDER BY total DESC
        LIMIT 1
      `

            const [extracts, persists, successes, topEntity] = await Promise.all([
                InfluxDBService.query(extractQuery),
                InfluxDBService.query(persistQuery),
                InfluxDBService.query(successQuery),
                InfluxDBService.query(entityActivityQuery)
            ])

            const totalExtractions = Number(extracts[0]?.total || 0)
            const totalPersisted = Number(persists[0]?.total || 0)
            const totalSuccesses = Number(successes[0]?.total || 0)
            const successRate = totalExtractions > 0 ? (totalSuccesses / totalExtractions) * 100 : 0
            const mostActiveEntity = topEntity[0]?.entity_type || 'N/A'

            return {
                totalExtractions,
                totalPersisted,
                successRate,
                mostActiveEntity
            }
        } catch (error) {
            logger.error('[EXTRACTION-ANALYTICS] Failed to get overview stats:', error)
            return { totalExtractions: 0, totalPersisted: 0, successRate: 0, mostActiveEntity: 'N/A' }
        }
    }

    /**
     * Get entity type distribution
     */
    static async getEntityDistribution(period: string = '30d'): Promise<DistributionItem[]> {
        try {
            const sql = `
        SELECT count(count) as count
        FROM entity_operations
        WHERE operation = 'create'
          AND time >= now() - ${this.periodToInterval(period)}
        GROUP BY entity_type
        ORDER BY count DESC
      `
            const rows = await InfluxDBService.query(sql)
            return rows.map(r => ({
                entity_type: r.entity_type,
                count: Number(r.count)
            }))
        } catch (error) {
            logger.error('[EXTRACTION-ANALYTICS] Failed to get distribution:', error)
            return []
        }
    }

    /**
     * Get extraction trends over time
     */
    static async getExtractionTrends(period: string = '30d'): Promise<TrendItem[]> {
        try {
            // Group by day using date_bin or just TRUNC in SQL
            // InfluxDB 3.0 SQL support date_bin
            const sql = `
        SELECT count(count) as count, date_bin(interval '1 day', time) as time
        FROM entity_operations
        WHERE operation = 'extract'
          AND time >= now() - ${this.periodToInterval(period)}
        GROUP BY time
        ORDER BY time ASC
      `
            const rows = await InfluxDBService.query(sql)
            return rows.map(r => ({
                time: r.time,
                count: Number(r.count)
            }))
        } catch (error) {
            logger.error('[EXTRACTION-ANALYTICS] Failed to get trends:', error)
            return []
        }
    }

    /**
     * Map period (e.g., '7d', '30d') to InfluxDB interval
     */
    private static periodToInterval(period: string): string {
        switch (period) {
            case '24h': return '24h'
            case '7d': return '7d'
            case '30d': return '30d'
            case '90d': return '90d'
            default: return '30d'
        }
    }
}

export default ExtractionAnalyticsService
