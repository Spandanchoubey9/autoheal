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

  useEffect(() => {
  let cancelled = false;

  const fetchDashboard = async () => {
    setError('');

    try {
      const [healthResult, servicesResult, incidentsResult] =
        await Promise.all([
          getHealth(),
          getServices(),
          getIncidents(),
        ]);

      if (!cancelled) {
        setHealth(healthResult.data);
        setServices(servicesResult.data.services || []);
        setIncidents(incidentsResult.data.incidents || []);
      }
    } catch (err) {
      if (!cancelled) {
        setError(
          err.response?.data?.message ||
          'Unable to connect to the AutoHeal backend.'
        );
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  };

  fetchDashboard();

  return () => {
    cancelled = true;
  };
}, []);

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
    'Service Overview': 'Monitor the health and availability of your application services.',
    'Infrastructure Monitoring': 'Observe infrastructure performance and resource utilization.',
    'Incident Management': 'Track incidents, investigate failures and verify recovery.',
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
              <span className={health?.database === 'connected' ? 'live-indicator' : 'offline-indicator'} />
              {health?.database === 'connected' ? 'Backend connected' : 'Backend unavailable'}
            </div>
            <button
              className="icon-button"
              title="Refresh dashboard"
              onClick={() => {
                setLoading(true);
                loadDashboard();
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
                      value={health?.database === 'connected' ? 'Online' : 'Offline'}
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
                        <span className="count-pill">{services.length} services</span>
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
                        <span>Connection status from the backend health API.</span>
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

              {activePage === 'Infrastructure Monitoring' && (
                <>
                  <div className="section-heading">
                    <div>
                      <h2>Infrastructure resources</h2>
                      <p>Metrics collected from monitored infrastructure</p>
                    </div>
                    <span className="data-label">PROMETHEUS NOT CONNECTED</span>
                  </div>

                  <div className="metrics-grid">
                    <MetricCard
                      title="CPU utilization"
                      value="—"
                      description="Waiting for Prometheus metrics"
                      icon={Cpu}
                      tone="blue"
                    />
                    <MetricCard
                      title="Memory utilization"
                      value="—"
                      description="Waiting for Prometheus metrics"
                      icon={Activity}
                      tone="purple"
                    />
                    <MetricCard
                      title="Monitored services"
                      value={services.length}
                      description="Registered application services"
                      icon={Server}
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
                        <h3>Resource utilization</h3>
                        <p>CPU and memory usage over time</p>
                      </div>
                      <Activity size={19} className="muted-icon" />
                    </div>
                    <div className="integration-empty">
                      <div className="empty-icon"><Activity size={27} /></div>
                      <h3>Metrics collection not configured</h3>
                      <p>
                        Prometheus integration will provide real-time CPU,
                        memory and infrastructure metrics here.
                      </p>
                      <span className="integration-tag">PROMETHEUS · GRAFANA</span>
                    </div>
                  </section>
                </>
              )}

              {activePage === 'Incident Management' && (
                <>
                  <div className="section-heading">
                    <div>
                      <h2>Incident records</h2>
                      <p>Review and manage recorded application incidents</p>
                    </div>
                    <span className="count-pill">{incidents.length} total</span>
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
                      value={incidents.filter((item) => item.severity === 'high').length}
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
            <span>AutoHeal Cloud Monitoring &amp; Self-Recovery Platform</span>
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
                  <span>INC-{String(incident.id).padStart(4, '0')}</span>
                </div>
              </td>
              <td>{incident.service_name || 'Unassigned'}</td>
              <td>
                <span className={`severity severity-${incident.severity}`}>
                  {incident.severity}
                </span>
              </td>
              <td><StatusBadge status={incident.status} /></td>
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
