const fs = require('fs');
const https = require('https');
const pool = require('../config/db');

const NAMESPACE = 'default';
const TARGET_DEPLOYMENT = 'autoheal-frontend';
const EXPECTED_REPLICAS = Number(process.env.AUTOHEAL_EXPECTED_REPLICAS || 1);

const CHECK_INTERVAL = 30000;
const FAILURE_THRESHOLD = 60000;
const COOLDOWN = 300000;
const RECOVERY_TIMEOUT = 120000;

const API_PATH =
  `/apis/apps/v1/namespaces/${NAMESPACE}/deployments/${TARGET_DEPLOYMENT}`;

const state = {
  enabled: process.env.AUTOHEAL_ENABLED === 'true',
  target: TARGET_DEPLOYMENT,
  currentState: 'starting',
  lastCheck: null,
  lastAction: 'none',
  attempts: 0,
  successfulRecoveries: 0,
  failedRecoveries: 0
};

let unhealthySince = null;
let lastAttemptAt = 0;
let busy = false;
let monitorStarted = false;

function kubernetesRequest(method, body = null) {
  const tokenPath = '/var/run/secrets/kubernetes.io/serviceaccount/token';
  const caPath = '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt';

  const token = fs.readFileSync(tokenPath, 'utf8').trim();
  const ca = fs.readFileSync(caPath);

  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: 'kubernetes.default.svc',
      port: 443,
      path: API_PATH,
      method,
      ca,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/merge-patch+json' } : {})
      }
    }, response => {
      let data = '';

      response.on('data', chunk => {
        data += chunk;
      });

      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          return reject(new Error(
            `Kubernetes API returned ${response.statusCode}: ${data}`
          ));
        }

        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (error) {
          reject(error);
        }
      });
    });

    request.setTimeout(10000, () => {
      request.destroy(new Error('Kubernetes API request timed out'));
    });

    request.on('error', reject);
    request.end(body ? JSON.stringify(body) : undefined);
  });
}

function isHealthy(deployment) {
  const status = deployment.status || {};
  const generation = Number(deployment.metadata?.generation || 0);

  return (
    Number(status.availableReplicas || 0) >= EXPECTED_REPLICAS &&
    Number(status.updatedReplicas || 0) >= EXPECTED_REPLICAS &&
    Number(status.observedGeneration || 0) >= generation
  );
}

async function createIncident() {
  try {
    const service = await pool.query(
      'SELECT id FROM services ORDER BY id LIMIT 1'
    );

    if (!service.rows.length) {
      console.warn('AutoHeal: no service record found; incident was not stored.');
      return null;
    }

    const result = await pool.query(
      `INSERT INTO incidents
         (service_id, title, description, severity)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        service.rows[0].id,
        'Frontend deployment unavailable',
        'AutoHeal detected sustained unavailability and initiated a recovery attempt.',
        'high'
      ]
    );

    return result.rows[0].id;
  } catch (error) {
    console.error('AutoHeal: could not record incident:', error.message);
    return null;
  }
}

async function resolveIncident(id) {
  if (!id) return;

  try {
    await pool.query(
      `UPDATE incidents
       SET status = 'resolved',
           resolved_at = CURRENT_TIMESTAMP,
           description = $2
       WHERE id = $1`,
      [
        id,
        'AutoHeal restarted the frontend deployment and verified that the expected replicas became available.'
      ]
    );
  } catch (error) {
    console.error('AutoHeal: could not resolve incident:', error.message);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForRecovery() {
  const start = Date.now();

  while (Date.now() - start < RECOVERY_TIMEOUT) {
    await sleep(5000);

    const deployment = await kubernetesRequest('GET');

    if (isHealthy(deployment)) {
      return true;
    }
  }

  return false;
}

async function checkDeployment() {
  if (busy) return;
  busy = true;
  state.lastCheck = new Date().toISOString();

  try {
    const deployment = await kubernetesRequest('GET');

    if (isHealthy(deployment)) {
      state.currentState = 'healthy';
      unhealthySince = null;
      return;
    }

    state.currentState = 'degraded';

    if (!unhealthySince) {
      unhealthySince = Date.now();
      console.warn(`AutoHeal: ${TARGET_DEPLOYMENT} is unavailable.`);
    }

    if (Date.now() - unhealthySince < FAILURE_THRESHOLD) return;
    if (Date.now() - lastAttemptAt < COOLDOWN) return;

    lastAttemptAt = Date.now();
    state.attempts += 1;
    state.lastAction = 'recovery_initiated';

    console.warn('AutoHeal: initiating controlled deployment restart.');

    const incidentId = await createIncident();

    await kubernetesRequest('PATCH', {
      spec: {
        replicas: EXPECTED_REPLICAS,
        template: {
          metadata: {
            annotations: {
              'autoheal/restarted-at': new Date().toISOString()
            }
          }
        }
      }
    });

    const recovered = await waitForRecovery();

    if (recovered) {
      state.currentState = 'healthy';
      state.lastAction = 'recovery_verified';
      state.successfulRecoveries += 1;
      unhealthySince = null;

      await resolveIncident(incidentId);
      console.log('AutoHeal: recovery verified successfully.');
    } else {
      state.currentState = 'degraded';
      state.lastAction = 'recovery_unverified';
      state.failedRecoveries += 1;

      console.error('AutoHeal: deployment did not recover within the timeout.');
    }
  } catch (error) {
    state.currentState = 'monitor_error';
    state.lastAction = 'error';
    console.error('AutoHeal controller error:', error.message);
  } finally {
    busy = false;
  }
}

function startRecoveryMonitor() {
  if (!state.enabled || monitorStarted) return;

  try {
    fs.accessSync('/var/run/secrets/kubernetes.io/serviceaccount/token');
    fs.accessSync('/var/run/secrets/kubernetes.io/serviceaccount/ca.crt');
  } catch {
    console.warn('AutoHeal: Kubernetes ServiceAccount credentials are unavailable.');
    return;
  }

  monitorStarted = true;
  console.log(`AutoHeal recovery monitor started for ${TARGET_DEPLOYMENT}.`);

  checkDeployment().catch(error => {
    console.error('AutoHeal initial check failed:', error.message);
  });

  const timer = setInterval(() => {
    checkDeployment().catch(error => {
      console.error('AutoHeal monitoring check failed:', error.message);
    });
  }, CHECK_INTERVAL);

  timer.unref();
}

function getStatus() {
  return { ...state };
}

module.exports = {
  startRecoveryMonitor,
  getStatus
};
