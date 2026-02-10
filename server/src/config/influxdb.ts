import { InfluxDBClient } from '@influxdata/influxdb3-client'

const token = process.env.INFLUXDB_TOKEN
const host = process.env.INFLUXDB_URL || 'https://eu-central-1-1.aws.cloud2.influxdata.com'

export const influxDBClient = new InfluxDBClient({
    host,
    token,
    database: process.env.INFLUXDB_DATABASE
})

export const INFLUXDB_ORG = process.env.INFLUXDB_ORG || ''
export const INFLUXDB_DATABASE = process.env.INFLUXDB_DATABASE || ''
