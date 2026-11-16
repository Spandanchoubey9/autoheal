
const express = require('express');
const router = express.Router();

const PROMETHEUS_URL =
    process.env.PROMETHEUS_URL ||
    'http://prometheus.monitoring.svc.cluster.local:9090';

// Helper to query Prometheus
async function queryPrometheus(query) {
    const url = new URL('/api/v1/query', PROMETHEUS_URL);
    url.searchParams.set('query', query);

    const response = await fetch(url, {
        signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
        throw new Error(`Prometheus returned HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'success') {
        throw new Error('Prometheus query failed');
    }

    return data.data.result;
}

// Infrastructure metrics
router.get('/', async (req, res) => {
    try {
        const [cpu, memory] = await Promise.all([
            queryPrometheus(
                'sum by (namespace,pod,container) (rate(container_cpu_usage_seconds_total{container!="",container!="POD"}[5m]))'
            ),
            queryPrometheus(
                'container_memory_working_set_bytes{container!="",container!="POD"}'
            )
        ]);

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            metrics: {
                cpu,
                memory
            }
        });
    } catch (error) {
        console.error('Prometheus metrics error:', error.message);

        res.status(503).json({
            success: false,
            message: 'Unable to retrieve Prometheus metrics',
            error: error.message
        });
    }
});

// Prometheus scrape target health
router.get('/targets', async (req, res) => {
    try {
        const response = await fetch(
            `${PROMETHEUS_URL}/api/v1/targets?state=active`,
            { signal: AbortSignal.timeout(5000) }
        );

        if (!response.ok) {
            throw new Error(`Prometheus returned HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.status !== 'success') {
            throw new Error('Unable to retrieve Prometheus targets');
        }

        const targets = data.data.activeTargets.map(target => ({
            job: target.labels.job,
            instance: target.labels.instance,
            health: target.health,
            lastScrape: target.lastScrape,
            lastError: target.lastError
        }));

        res.json({
            success: true,
            total: targets.length,
            healthy: targets.filter(t => t.health === 'up').length,
            unhealthy: targets.filter(t => t.health !== 'up').length,
            targets
        });
    } catch (error) {
        console.error('Prometheus targets error:', error.message);

        res.status(503).json({
            success: false,
            message: 'Unable to retrieve Prometheus targets',
            error: error.message
        });
    }
});

module.exports = router;

