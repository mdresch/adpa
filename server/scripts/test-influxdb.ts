import 'dotenv/config'
import { InfluxDBService } from '../src/services/influxdbService'
import { logger } from '../src/utils/logger'

async function main() {
    logger.info('Starting InfluxDB verification...')

    try {
        await InfluxDBService.writePoint(
            'test_measurement',
            { value: 1.0, status: 'ok' },
            { environment: 'test' }
        )
        logger.info('Successfully wrote test point to InfluxDB')
    } catch (error) {
        logger.error('Failed to write test point to InfluxDB:', error)
    } finally {
        InfluxDBService.close()
        logger.info('InfluxDB client closed')
    }
}

main().catch(error => {
    logger.error('Unhandled error in verification script:', error)
    process.exit(1)
})
