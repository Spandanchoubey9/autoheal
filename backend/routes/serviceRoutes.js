const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM services ORDER BY id'
        );

        res.json({
            success: true,
            count: result.rows.length,
            services: result.rows
        });
    } catch (error) {
        console.error('Services API error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Unable to fetch services'
        });
    }
});

module.exports = router;
