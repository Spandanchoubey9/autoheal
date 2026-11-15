const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all incidents
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT i.*, s.name AS service_name
            FROM incidents i
            LEFT JOIN services s ON i.service_id = s.id
            ORDER BY i.detected_at DESC
        `);

        res.json({
            success: true,
            count: result.rows.length,
            incidents: result.rows
        });
    } catch (error) {
        console.error('Incident fetch error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Unable to fetch incidents'
        });
    }
});

// Create an incident
router.post('/', async (req, res) => {
    try {
        const { service_id, title, description, severity } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Incident title is required'
            });
        }

        const result = await pool.query(
            `INSERT INTO incidents
             (service_id, title, description, severity)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [service_id || null, title.trim(), description || null, severity || 'medium']
        );

        res.status(201).json({
            success: true,
            incident: result.rows[0]
        });
    } catch (error) {
        console.error('Incident creation error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Unable to create incident'
        });
    }
});

// Resolve an incident
router.patch('/:id/resolve', async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE incidents
             SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [req.params.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Incident not found'
            });
        }

        res.json({
            success: true,
            incident: result.rows[0]
        });
    } catch (error) {
        console.error('Incident resolution error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Unable to resolve incident'
        });
    }
});

module.exports = router;
