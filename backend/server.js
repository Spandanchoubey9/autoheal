require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const pool = require('./config/db');
const serviceRoutes = require('./routes/serviceRoutes');
const incidentRoutes = require('./routes/incidentRoutes');

const app = express();
const monitoringRoutes = require('./routes/monitoringRoutes');

// Middleware must execute before routes
app.use(helmet());
app.use(cors());
app.use(express.json());
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to AutoHeal API',
        status: 'running'
    });
});

// Backend and database health
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

// API routes
app.use('/api/services', serviceRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/metrics', monitoringRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`AutoHeal backend running on port ${PORT}`);
});
