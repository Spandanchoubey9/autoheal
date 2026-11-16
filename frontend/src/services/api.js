import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export const getHealth = () => api.get('/health');
export const getServices = () => api.get('/services');
export const getIncidents = () => api.get('/incidents');
export const getMetrics = () => api.get('/metrics');
export const getMonitoringTargets = () => api.get('/metrics/targets');

export const resolveIncident = (id) =>
    api.patch(`/incidents/${id}/resolve`);

export default api;
