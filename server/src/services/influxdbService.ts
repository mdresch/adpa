import { Point } from '@influxdata/influxdb3-client'
import { influxDBClient, INFLUXDB_ORG, INFLUXDB_DATABASE } from '../config/influxdb'
import { logger } from '../utils/logger'

export class InfluxDBService {
    /**
     * Write a single point to InfluxDB
     */
    static async writePoint(
        measurement: string,
        fields: Record<string, any>,
        tags: Record<string, string> = {}
    ): Promise<void> {
        if (!influxDBClient || !INFLUXDB_DATABASE) {
            logger.warn('[INFLUXDB] Skipping write - InfluxDB not configured')
            return
        }

        try {
            const point = Point.measurement(measurement)

            // Add tags
            Object.entries(tags).forEach(([key, value]) => {
                point.setTag(key, value)
            })

            // Add fields
            Object.entries(fields).forEach(([key, value]) => {
                if (typeof value === 'number') {
                    point.setFloatField(key, value)
                } else if (typeof value === 'boolean') {
                    point.setBooleanField(key, value)
                } else if (typeof value === 'string') {
                    point.setStringField(key, value)
                } else if (typeof value === 'bigint') {
                    point.setUintegerField(key, value)
                }
            })

            await influxDBClient.write(point)

            logger.debug(`[INFLUXDB] Point written to ${measurement}`, { tags, fields })
        } catch (error) {
            logger.error('[INFLUXDB] Error writing point:', error)
        }
    }

    /**
     * Specialized method for tracking entity operations
     */
    static async recordEntityOperation(
        entityType: string,
        operation: 'view' | 'create' | 'update' | 'delete' | 'extract',
        count: number = 1,
        tags: Record<string, string> = {}
    ): Promise<void> {
        await this.writePoint(
            'entity_operations',
            { count },
            {
                entity_type: entityType,
                operation,
                ...tags
            }
        );
    }

    /**
     * Query InfluxDB using SQL
     */
    static async query(sql: string): Promise<any[]> {
        if (!influxDBClient || !INFLUXDB_DATABASE) {
            logger.warn('[INFLUXDB] Skipping query - InfluxDB not configured')
            return []
        }

        try {
            const results: any[] = []
            // The influxdb3-client query method returns an AsyncIterable
            const rows = await influxDBClient.query(sql)

            for await (const row of rows) {
                results.push(row)
            }

            return results
        } catch (error) {
            logger.error('[INFLUXDB] Error executing query:', error)
            throw error
        }
    }

    /**
     * Close the InfluxDB client
     */
    static close(): void {
        if (!influxDBClient) {
            return
        }
        influxDBClient.close()
    }
}

export default InfluxDBService
