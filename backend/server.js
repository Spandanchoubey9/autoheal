require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const pool = require('./config/db');
const serviceRoutes = require('./routes/serviceRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const monitoringRoutes = require('./routes/monitoringRoutes');
const recoveryRoutes = require('./routes/recoveryRoutes');
const recoveryController = require('./services/recoveryController');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to AutoHeal API',
        status: 'running'
    });
});

app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');

        res.status(200).json({
            service: 'AutoHeal Backend',
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            service: 'AutoHeal Backend',
            status: 'unhealthy',
            database: 'disconnected'
        });
    }
});

app.use('/api/services', serviceRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/metrics', monitoringRoutes);
app.use('/api/recovery', recoveryRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`AutoHeal backend running on port ${PORT}`);
    recoveryController.startRecoveryMonitor();
});