import { InfluxDBClient } from '@influxdata/influxdb3-client'
import { logger } from '../utils/logger'

const token = (process.env.INFLUXDB_TOKEN || '').trim()
const host = process.env.INFLUXDB_URL || 'https://eu-central-1-1.aws.cloud2.influxdata.com'

export const INFLUXDB_ORG = process.env.INFLUXDB_ORG || ''
export const INFLUXDB_DATABASE = process.env.INFLUXDB_DATABASE || ''

const isConfigured = Boolean(token && INFLUXDB_DATABASE)

if (!isConfigured) {
    logger.warn('[INFLUXDB] Disabled - missing INFLUXDB_TOKEN or INFLUXDB_DATABASE')
}

export const influxDBClient = isConfigured
    ? new InfluxDBClient({
        host,
        token,
        database: INFLUXDB_DATABASE
    })
    : null
