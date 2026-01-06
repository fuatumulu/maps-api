const express = require('express');
const router = express.Router();
const db = require('../database');

// Maximum limit cap
const MAX_LIMIT = 10000;
const DEFAULT_LIMIT = 100;

/**
 * Parse and validate limit from query
 */
function parseLimit(limitStr) {
    const limit = parseInt(limitStr) || DEFAULT_LIMIT;
    return Math.min(Math.max(1, limit), MAX_LIMIT);
}

/**
 * Extract filters from query parameters
 */
function extractFilters(query) {
    const filters = {};
    const filterKeys = [
        'city', 'state', 'type', 'country_code', 'country', 'borough', 'place_id',
        'reviews', 'reviews_min', 'reviews_max',
        'rating', 'rating_min', 'rating_max',
        'name_contains'
    ];

    for (const key of filterKeys) {
        if (query[key] !== undefined) {
            filters[key] = query[key];
        }
    }

    return filters;
}

/**
 * GET /api/v1/places
 * Get places with filtering and pagination
 */
router.get('/', async (req, res) => {
    try {
        const filters = extractFilters(req.query);
        const limit = parseLimit(req.query.limit);
        const offset = parseInt(req.query.offset) || 0;

        const places = await db.getPlaces(filters, limit, offset);

        // Get total count for pagination info
        const total = await db.countPlaces(filters);

        res.json({
            success: true,
            data: places,
            pagination: {
                limit,
                offset,
                count: places.length,
                total,
                has_more: offset + places.length < total
            },
            filters_applied: filters
        });
    } catch (error) {
        console.error('Error fetching places:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/places/count
 * Get count of places matching filters
 */
router.get('/count', async (req, res) => {
    try {
        const filters = extractFilters(req.query);
        const total = await db.countPlaces(filters);

        res.json({
            success: true,
            data: {
                count: total
            },
            filters_applied: filters
        });
    } catch (error) {
        console.error('Error counting places:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/places/stream
 * Stream places as NDJSON (Newline Delimited JSON)
 * Ideal for large datasets (millions of records)
 */
router.get('/stream', async (req, res) => {
    try {
        const filters = extractFilters(req.query);
        const limit = req.query.limit ? parseInt(req.query.limit) : 0; // 0 = unlimited

        // Set headers for NDJSON streaming
        res.setHeader('Content-Type', 'application/x-ndjson');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('X-Content-Type-Options', 'nosniff');

        const stream = await db.streamPlaces(filters, limit);
        let count = 0;

        stream.on('data', (row) => {
            count++;
            res.write(JSON.stringify(row) + '\n');
        });

        stream.on('end', () => {
            // Send final metadata line
            res.write(JSON.stringify({ _meta: { total_streamed: count, complete: true } }) + '\n');
            res.end();
        });

        stream.on('error', (error) => {
            console.error('Stream error:', error);
            res.write(JSON.stringify({ _error: error.message }) + '\n');
            res.end();
        });

        // Handle client disconnect
        req.on('close', () => {
            stream.destroy();
        });

    } catch (error) {
        console.error('Error streaming places:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/stats
 * Get database statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await db.getStats();

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

module.exports = router;
