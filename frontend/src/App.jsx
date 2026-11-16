
import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Cloud,
  Cpu,
  Database,
  LayoutDashboard,
  RefreshCw,
  Server,
  ShieldCheck,
  Wifi,
} from 'lucide-react';

import {
  getHealth,
  getServices,
  getIncidents,
  getMetrics,
  getMonitoringTargets,
  resolveIncident,
} from './services/api';

import './App.css';

const navigation = [
  { label: 'Service Overview', icon: LayoutDashboard },
  { label: 'Infrastructure Monitoring', icon: Activity },
  { label: 'Incident Management', icon: AlertTriangle },
];

function StatusBadge({ status }) {
  const normalized = (status || 'unknown').toLowerCase();

  return (
    <span className={`status-badge status-${normalized}`}>
      <span className="status-dot" />
      {normalized}
    </span>
  );
}

function MetricCard({ title, value, description, icon: Icon, tone }) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${tone}`}>
        <Icon size={19} />
      </div>
      <p className="metric-label">{title}</p>
      <h2>{value}</h2>
      <p className="metric-description">{description}</p>
    </div>
  );
}

function App() {
  const [activePage, setActivePage] = useState('Service Overview');
  const [services, setServices] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolving, setResolving] = useState(null);

  // Prometheus monitoring state
  const [metrics, setMetrics] = useState(null);
  const [monitoringTargets, setMonitoringTargets] = useState(null);
  const [metricsError, setMetricsError] = useState('');
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Load application dashboard data
  const loadDashboard = useCallback(async () => {
    setError('');

    try {
      const [healthResult, servicesResult, incidentsResult] =
        await Promise.all([
          getHealth(),
          getServices(),
          getIncidents(),
        ]);

      setHealth(healthResult.data);
      setServices(servicesResult.data.services || []);
      setIncidents(incidentsResult.data.incidents || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to connect to the AutoHeal backend. Check that the backend is running.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Prometheus metrics and target health
  const loadMonitoringData = useCallback(async () => {
    setMetricsLoading(true);

    try {
      const [metricsResult, targetsResult] = await Promise.all([
        getMetrics(),
        getMonitoringTargets(),
      ]);

      setMetrics(metricsResult.data.metrics);
      setMonitoringTargets(targetsResult.data);
      setMetricsError('');
    } catch (err) {
      setMetricsError(
        err.response?.data?.message ||
        'Unable to retrieve Prometheus metrics.'
      );
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // Initial dashboard load
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Refresh Prometheus metrics every 15 seconds
  useEffect(() => {
    loadMonitoringData();

    const intervalId = setInterval(loadMonitoringData, 15000);

    return () => clearInterval(intervalId);
  }, [loadMonitoringData]);

  // Extract Prometheus results
  const cpuRows = metrics?.cpu || [];
  const memoryRows = metrics?.memory || [];

  // Calculate aggregate CPU and memory usage
  const totalCpuCores = cpuRows.reduce(
    (total, row) => total + Number(row.value?.[1] || 0),
    0
  );

  const totalMemoryBytes = memoryRows.reduce(
    (total, row) => total + Number(row.value?.[1] || 0),
    0
  );

  const totalCpuMilliCores = totalCpuCores * 1000;
  const totalMemoryMiB = totalMemoryBytes / (1024 * 1024);

  // Combine CPU and memory measurements by container
  const podMetricsMap = new Map();

  cpuRows.forEach((row) => {
    const labels = row.metric || {};

    const key = `${labels.namespace || 'unknown'}/${labels.pod || labels.container || 'unknown'}/${labels.container || 'unknown'}`;

    podMetricsMap.set(key, {
      key,
      namespace: labels.namespace || 'unknown',
      pod: labels.pod || 'unknown',
      container: labels.container || 'unknown',
      cpuCores: Number(row.value?.[1] || 0),
      memoryBytes: 0,
    });
  });

  memoryRows.forEach((row) => {
    const labels = row.metric || {};

    const key = `${labels.namespace || 'unknown'}/${labels.pod || labels.container || 'unknown'}/${labels.container || 'unknown'}`;

    const existing = podMetricsMap.get(key) || {
      key,
      namespace: labels.namespace || 'unknown',
      pod: labels.pod || 'unknown',
      container: labels.container || 'unknown',
      cpuCores: 0,
      memoryBytes: 0,
    };

    existing.memoryBytes = Number(row.value?.[1] || 0);
    podMetricsMap.set(key, existing);
  });

  const podMetrics = Array.from(podMetricsMap.values()).sort(
    (a, b) => b.memoryBytes - a.memoryBytes
  );

  // Resolve an incident
  const handleResolve = async (id) => {
    try {
      setResolving(id);
      await resolveIncident(id);
      await loadDashboard();
    } catch {
      setError('Unable to resolve this incident. Please try again.');
    } finally {
      setResolving(null);
    }
  };

  const openIncidents = incidents.filter(
    (incident) => incident.status === 'open'
  ).length;

  const resolvedIncidents = incidents.filter(
    (incident) => incident.status === 'resolved'
  ).length;

  const pageDescription = {
    'Service Overview':
      'Monitor the health and availability of your application services.',
    'Infrastructure Monitoring':
      'Observe infrastructure performance and resource utilization.',
    'Incident Management':
      'Track incidents, investigate failures and verify recovery.',
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <ShieldCheck size={23} />
          </div>

          <div>
            <h1>AutoHeal</h1>
            <span>Cloud Operations</span>
          </div>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${activePage === label ? 'active' : ''}`}
              onClick={() => setActivePage(label)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {activePage === label && <ChevronRight size={16} />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-status">
            <span className="live-indicator" />

            <div>
              <strong>Monitoring workspace</strong>
              <small>Local development</small>
            </div>
          </div>

          <div className="sidebar-footer">
            <span>AutoHeal</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-actions">
            <div className="connection-status">
              <span
                className={
                  health?.database === 'connected'
                    ? 'live-indicator'
                    : 'offline-indicator'
                }
              />

              {health?.database === 'connected'
                ? 'Backend connected'
                : 'Backend unavailable'}
            </div>

            <button
              className="icon-button"
              title="Refresh dashboard"
              onClick={() => {
                setLoading(true);
                loadDashboard();

                if (activePage === 'Infrastructure Monitoring') {
                  loadMonitoringData();
                }
              }}
            >
              <RefreshCw size={17} />
            </button>

            <div className="avatar">AH</div>
          </div>
        </header>

        <section className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">AUTOHEAL / MONITORING</div>
              <h1>{activePage}</h1>
              <p>{pageDescription[activePage]}</p>
            </div>

            <div className="page-date">
              <Clock3 size={15} />
              <span>Live dashboard</span>
            </div>
          </div>

          {error && (
            <div className="error-banner">
              <AlertCircle size={18} />
              <span>{error}</span>
              <button onClick={loadDashboard}>Retry</button>
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <RefreshCw className="spin" size={23} />
              Loading dashboard data...
            </div>
          ) : (
            <>
              {/* SERVICE OVERVIEW */}
              {activePage === 'Service Overview' && (
                <>
                  <div className="section-heading">
                    <div>
                      <h2>System overview</h2>
                      <p>Current application and incident summary</p>
                    </div>

                    <span className="data-label">DATABASE CONNECTED</span>
                  </div>

                  <div className="metrics-grid">
                    <MetricCard
                      title="Total services"
                      value={services.length}
                      description="Registered application services"
                      icon={Server}
                      tone="blue"
                    />

                    <MetricCard
                      title="Open incidents"
                      value={openIncidents}
                      description="Incidents requiring attention"
                      icon={AlertTriangle}
                      tone="orange"
                    />

                    <MetricCard
                      title="Resolved incidents"
                      value={resolvedIncidents}
                      description="Successfully marked resolved"
                      icon={CheckCircle2}
                      tone="green"
                    />

                    <MetricCard
                      title="Database"
                      value={
                        health?.database === 'connected' ? 'Online' : 'Offline'
                      }
                      description="PostgreSQL connectivity"
                      icon={Database}
                      tone="purple"
                    />
                  </div>

                  <div className="content-grid">
                    <section className="panel services-panel">
                      <div className="panel-heading">
                        <div>
                          <h3>Application services</h3>
                          <p>Services registered in AutoHeal</p>
                        </div>

                        <span className="count-pill">
                          {services.length} services
                        </span>
                      </div>

                      {services.length === 0 ? (
                        <div className="empty-state">
                          <Server size={25} />
                          <p>No services registered yet.</p>
                        </div>
                      ) : (
                        <div className="service-list">
                          {services.map((service) => (
                            <div className="service-row" key={service.id}>
                              <div className="service-symbol">
                                <Cloud size={19} />
                              </div>

                              <div className="service-info">
                                <strong>{service.name}</strong>
                                <span>{service.description}</span>
                              </div>

                              <StatusBadge status={service.status} />
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="panel health-panel">
                      <div className="panel-heading">
                        <div>
                          <h3>Backend health</h3>
                          <p>API and database connectivity</p>
                        </div>

                        <Wifi size={19} className="muted-icon" />
                      </div>

                      <div className="health-item">
                        <span>Express API</span>
                        <StatusBadge status={health?.status || 'unknown'} />
                      </div>

                      <div className="health-item">
                        <span>PostgreSQL</span>
                        <StatusBadge status={health?.database || 'unknown'} />
                      </div>

                      <div className="health-note">
                        <CheckCircle2 size={16} />
                        <span>
                          Connection status from the backend health API.
                        </span>
                      </div>
                    </section>
                  </div>

                  <section className="panel recent-panel">
                    <div className="panel-heading">
                      <div>
                        <h3>Recent incidents</h3>
                        <p>Latest recorded application incidents</p>
                      </div>

                      <button
                        className="text-button"
                        onClick={() => setActivePage('Incident Management')}
                      >
                        View all <ChevronRight size={15} />
                      </button>
                    </div>

                    <IncidentTable
                      incidents={incidents.slice(0, 5)}
                      onResolve={handleResolve}
                      resolving={resolving}
                    />
                  </section>
                </>
              )}

              {/* INFRASTRUCTURE MONITORING */}
              {activePage === 'Infrastructure Monitoring' && (
                <>
                  <div className="section-heading">
                    <div>
                      <h2>Infrastructure resources</h2>
                      <p>
                        Live Kubernetes metrics collected by Prometheus
                      </p>
                    </div>

                    <span className="data-label">
                      {monitoringTargets &&
                      monitoringTargets.unhealthy === 0
                        ? `PROMETHEUS CONNECTED · ${monitoringTargets.healthy}/${monitoringTargets.total} TARGETS UP`
                        : 'PROMETHEUS CHECKING'}
                    </span>
                  </div>

                  {metricsError && (
                    <div className="error-banner">
                      <AlertCircle size={18} />
                      <span>{metricsError}</span>
                      <button onClick={loadMonitoringData}>Retry</button>
                    </div>
                  )}

                  <div className="metrics-grid">
                    <MetricCard
                      title="CPU usage"
                      value={
                        metrics
                          ? `${totalCpuMilliCores.toFixed(1)} mCPU`
                          : '—'
                      }
                      description="Combined container CPU rate over 5 minutes"
                      icon={Cpu}
                      tone="blue"
                    />

                    <MetricCard
                      title="Memory usage"
                      value={
                        metrics
                          ? `${totalMemoryMiB.toFixed(1)} MiB`
                          : '—'
                      }
                      description="Combined container working-set memory"
                      icon={Activity}
                      tone="purple"
                    />

                    <MetricCard
                      title="Healthy targets"
                      value={
                        monitoringTargets
                          ? `${monitoringTargets.healthy}/${monitoringTargets.total}`
                          : '—'
                      }
                      description="Prometheus scrape targets currently up"
                      icon={CheckCircle2}
                      tone="green"
                    />

                    <MetricCard
                      title="Open incidents"
                      value={openIncidents}
                      description="Currently recorded incidents"
                      icon={AlertTriangle}
                      tone="orange"
                    />
                  </div>

                  <section className="panel monitoring-panel">
                    <div className="panel-heading">
                      <div>
                        <h3>Container resource usage</h3>
                        <p>
                          CPU rate and working-set memory reported by cAdvisor
                        </p>
                      </div>

                      <div className="connection-status">
                        {metricsLoading
                          ? 'Refreshing…'
                          : 'Refreshes every 15 seconds'}
                      </div>
                    </div>

                    {podMetrics.length === 0 ? (
                      <div className="empty-state">
                        <Activity size={25} />
                        <p>
                          {metricsLoading
                            ? 'Loading Prometheus metrics…'
                            : 'No container metrics are currently available.'}
                        </p>
                      </div>
                    ) : (
                      <div className="table-wrapper">
                        <table>
                          <thead>
                            <tr>
                              <th>NAMESPACE</th>
                              <th>POD</th>
                              <th>CONTAINER</th>
                              <th>CPU</th>
                              <th>MEMORY</th>
                            </tr>
                          </thead>

                          <tbody>
                            {podMetrics.map((pod) => (
                              <tr key={pod.key}>
                                <td>{pod.namespace}</td>
                                <td>{pod.pod}</td>
                                <td>{pod.container}</td>
                                <td>
                                  {(pod.cpuCores * 1000).toFixed(2)} mCPU
                                </td>
                                <td>
                                  {(
                                    pod.memoryBytes /
                                    (1024 * 1024)
                                  ).toFixed(1)}{' '}
                                  MiB
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>

                  <section className="panel monitoring-panel">
                    <div className="panel-heading">
                      <div>
                        <h3>Prometheus scrape targets</h3>
                        <p>
                          Health of the configured Kubernetes and Prometheus
                          scrapes
                        </p>
                      </div>

                      <Activity size={19} className="muted-icon" />
                    </div>

                    {!monitoringTargets ? (
                      <div className="empty-state">
                        <p>
                          {metricsLoading
                            ? 'Checking Prometheus targets…'
                            : 'Target information is unavailable.'}
                        </p>
                      </div>
                    ) : (
                      <div className="service-list">
                        {monitoringTargets.targets.map((target) => (
                          <div
                            className="service-row"
                            key={`${target.job}-${target.instance}`}
                          >
                            <div className="service-symbol">
                              <Activity size={19} />
                            </div>

                            <div className="service-info">
                              <strong>{target.job}</strong>
                              <span>
                                {target.instance}
                                {target.lastError
                                  ? ` · ${target.lastError}`
                                  : ''}
                              </span>
                            </div>

                            <StatusBadge status={target.health} />
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}

              {/* INCIDENT MANAGEMENT */}
              {activePage === 'Incident Management' && (
                <>
                  <div className="section-heading">
                    <div>
                      <h2>Incident records</h2>
                      <p>Review and manage recorded application incidents</p>
                    </div>

                    <span className="count-pill">
                      {incidents.length} total
                    </span>
                  </div>

                  <div className="metrics-grid incident-metrics">
                    <MetricCard
                      title="Total incidents"
                      value={incidents.length}
                      description="All recorded incidents"
                      icon={AlertCircle}
                      tone="blue"
                    />

                    <MetricCard
                      title="Open"
                      value={openIncidents}
                      description="Awaiting resolution"
                      icon={AlertTriangle}
                      tone="orange"
                    />

                    <MetricCard
                      title="Resolved"
                      value={resolvedIncidents}
                      description="Marked as resolved"
                      icon={CheckCircle2}
                      tone="green"
                    />

                    <MetricCard
                      title="High severity"
                      value={
                        incidents.filter(
                          (item) => item.severity === 'high'
                        ).length
                      }
                      description="High-severity records"
                      icon={ArrowUpRight}
                      tone="purple"
                    />
                  </div>

                  <section className="panel incidents-panel">
                    <div className="panel-heading">
                      <div>
                        <h3>All incidents</h3>
                        <p>Incident history from PostgreSQL</p>
                      </div>

                      <span className="data-label">LIVE API DATA</span>
                    </div>

                    <IncidentTable
                      incidents={incidents}
                      onResolve={handleResolve}
                      resolving={resolving}
                    />
                  </section>
                </>
              )}
            </>
          )}

          <footer className="page-footer">
            <span>
              AutoHeal Cloud Monitoring &amp; Self-Recovery Platform
            </span>
            <span>Built for cloud-native operations</span>
          </footer>
        </section>
      </main>
    </div>
  );
}

function IncidentTable({ incidents, onResolve, resolving }) {
  if (incidents.length === 0) {
    return (
      <div className="empty-state">
        <CircleHelp size={25} />
        <p>No incidents recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>INCIDENT</th>
            <th>SERVICE</th>
            <th>SEVERITY</th>
            <th>STATUS</th>
            <th>DETECTED</th>
            <th>ACTION</th>
          </tr>
        </thead>

        <tbody>
          {incidents.map((incident) => (
            <tr key={incident.id}>
              <td>
                <div className="incident-title">
                  <strong>{incident.title}</strong>
                  <span>
                    INC-{String(incident.id).padStart(4, '0')}
                  </span>
                </div>
              </td>

              <td>{incident.service_name || 'Unassigned'}</td>

              <td>
                <span className={`severity severity-${incident.severity}`}>
                  {incident.severity}
                </span>
              </td>

              <td>
                <StatusBadge status={incident.status} />
              </td>

              <td>
                {new Date(incident.detected_at).toLocaleString()}
              </td>

              <td>
                {incident.status === 'open' ? (
                  <button
                    className="resolve-button"
                    disabled={resolving === incident.id}
                    onClick={() => onResolve(incident.id)}
                  >
                    {resolving === incident.id ? 'Saving...' : 'Resolve'}
                  </button>
                ) : (
                  <span className="resolved-label">
                    <CheckCircle2 size={14} /> Completed
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
