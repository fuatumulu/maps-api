const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { authenticate } = require('./middleware/auth');
const placesRoutes = require('./routes/places');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Compression for responses
app.use(compression());

// Parse JSON bodies
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per minute
    message: {
        success: false,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(limiter);

// Health check endpoint (no auth required)
app.get('/health', async (req, res) => {
    const dbConnected = await db.testConnection();

    res.status(dbConnected ? 200 : 503).json({
        status: dbConnected ? 'healthy' : 'unhealthy',
        database: dbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// API info endpoint (no auth required)
app.get('/', (req, res) => {
    res.json({
        name: 'Places API',
        version: '1.0.0',
        description: 'High-performance API for business places with filtering and streaming support',
        endpoints: {
            'GET /health': 'Health check',
            'GET /api/v1/places': 'Get places with filtering and pagination',
            'GET /api/v1/places/count': 'Get count of places matching filters',
            'GET /api/v1/places/stream': 'Stream places as NDJSON',
            'GET /api/v1/places/stats': 'Get database statistics'
        },
        documentation: 'See API_DOCUMENTATION.md for full details'
    });
});

// Protected API routes
app.use('/api/v1/places', authenticate, placesRoutes);
app.use('/api/v1/stats', authenticate, async (req, res) => {
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

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Endpoint ${req.method} ${req.path} not found`
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: err.message
    });
});

// Start server
async function start() {
    let dbConnected = false;
    let retries = 5;

    while (retries > 0 && !dbConnected) {
        dbConnected = await db.testConnection();
        if (!dbConnected) {
            retries--;
            console.log(`⚠️ Database connection failed. Retrying in 5 seconds... (${retries} retries left)`);
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    if (!dbConnected) {
        console.error('❌ Failed to connect to database after multiple attempts. Exiting...');
        process.exit(1);
    }

    console.log('✅ Database connected successfully');

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Places API server running on port ${PORT}`);
        console.log(`📚 API Documentation: See API_DOCUMENTATION.md`);
        console.log(`❤️  Health check: http://localhost:${PORT}/health`);
    });
}

start().catch(console.error);
