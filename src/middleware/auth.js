/**
 * Authentication Middleware
 * Validates API token from Authorization header
 */

const API_TOKEN = process.env.API_TOKEN;

/**
 * Middleware to authenticate requests using Bearer token
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'Authorization header is required. Use: Authorization: Bearer <token>'
        });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'Invalid authorization format. Use: Authorization: Bearer <token>'
        });
    }

    const token = parts[1];

    if (!API_TOKEN) {
        console.error('API_TOKEN is not set in environment variables');
        return res.status(500).json({
            success: false,
            error: 'Server Configuration Error',
            message: 'API token is not configured on server'
        });
    }

    if (token !== API_TOKEN) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'Invalid API token'
        });
    }

    next();
}

module.exports = { authenticate };
