# Grafana Dashboards for ADPA Queue Service

This directory contains Grafana dashboard configurations for monitoring the ADPA queue service.

## Dashboard: Queue Service Monitoring

**File**: `queue-service-dashboard.json`

### Overview

This dashboard provides comprehensive monitoring of the queue service, including:

- **Queue Job States**: Waiting, Active, Failed, Completed, Delayed
- **Performance Metrics**: Operation durations (P95, P99), average times
- **Cache Statistics**: Hit rates, hits vs misses
- **Throughput**: Jobs completed/failed per second

### Setup Instructions

1. **Import Dashboard into Grafana**:
   ```bash
   # Using Grafana CLI (if installed)
   grafana-cli admin import-dashboard queue-service-dashboard.json
   
   # Or manually:
   # 1. Open Grafana UI
   # 2. Go to Dashboards > Import
   # 3. Upload queue-service-dashboard.json
   ```

2. **Configure Prometheus Data Source**:
   - Ensure Prometheus is scraping metrics from `http://your-server:5000/metrics`
   - In Grafana: Configuration > Data Sources > Add Prometheus
   - Set URL to your Prometheus instance (e.g., `http://prometheus:9090`)

3. **Verify Metrics Endpoint**:
   ```bash
   curl http://localhost:5000/metrics
   ```
   Should return Prometheus-formatted metrics.

### Metrics Exposed

The dashboard expects the following metrics (exposed via `/metrics` endpoint):

#### Queue Metrics
- `queue_ai_processing_jobs_waiting` - Gauge
- `queue_ai_processing_jobs_active` - Gauge
- `queue_ai_processing_jobs_completed_total` - Counter
- `queue_ai_processing_jobs_failed_total` - Counter
- `queue_ai_processing_jobs_delayed` - Gauge

#### Performance Metrics
- `queue_service_add_job_duration_ms` - Summary (with quantiles)
- `queue_service_get_job_status_duration_ms` - Summary
- `queue_service_update_job_status_duration_ms` - Summary

#### Cache Metrics
- `cache_queue_service_name_resolution_hits_total` - Counter
- `cache_queue_service_name_resolution_misses_total` - Counter
- `cache_queue_service_name_resolution_hit_rate` - Gauge

### Customization

You can customize the dashboard by:
1. Editing the JSON file
2. Importing into Grafana
3. Making changes in the Grafana UI
4. Exporting the updated JSON

### Alerts (Optional)

Recommended alerts to configure:

1. **High Failed Job Rate**: Alert when `rate(queue_ai_processing_jobs_failed_total[5m]) > 1`
2. **Queue Backlog**: Alert when `queue_ai_processing_jobs_waiting > 500`
3. **Slow Operations**: Alert when `queue_service_add_job_duration_ms{quantile="0.95"} > 5000`
4. **Low Cache Hit Rate**: Alert when `cache_queue_service_name_resolution_hit_rate < 0.5`

### Troubleshooting

**No data showing?**
- Verify Prometheus is scraping the `/metrics` endpoint
- Check that metrics are being generated (curl the endpoint)
- Ensure Prometheus data source is configured correctly in Grafana

**Metrics not matching?**
- Check metric names match between dashboard and actual metrics
- Verify queue names match (dashboard uses `ai_processing` by default)
- Check time range in Grafana (try "Last 1 hour")
