const mysql = require('mysql2/promise');

/**
 * MySQL Connection Pool
 * Provides efficient connection management for high-throughput queries
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

/**
 * Execute a query and return results
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Get a connection from the pool for streaming
 * @returns {Promise<mysql.PoolConnection>}
 */
async function getConnection() {
  return await pool.getConnection();
}

/**
 * Build WHERE clause from filters
 * @param {Object} filters - Filter object
 * @returns {{ whereClause: string, params: Array }}
 */
function buildWhereClause(filters) {
  const conditions = [];
  const params = [];

  // Equality filters
  const equalityFields = ['city', 'state', 'type', 'county_code', 'county', 'borough', 'place_id'];
  
  for (const field of equalityFields) {
    if (filters[field]) {
      conditions.push(`${field} = ?`);
      params.push(filters[field]);
    }
  }

  // Numeric range filters - reviews
  if (filters.reviews !== undefined) {
    conditions.push('reviews = ?');
    params.push(parseInt(filters.reviews));
  }
  if (filters.reviews_min !== undefined) {
    conditions.push('reviews >= ?');
    params.push(parseInt(filters.reviews_min));
  }
  if (filters.reviews_max !== undefined) {
    conditions.push('reviews <= ?');
    params.push(parseInt(filters.reviews_max));
  }

  // Numeric range filters - rating
  if (filters.rating !== undefined) {
    conditions.push('rating = ?');
    params.push(parseFloat(filters.rating));
  }
  if (filters.rating_min !== undefined) {
    conditions.push('rating >= ?');
    params.push(parseFloat(filters.rating_min));
  }
  if (filters.rating_max !== undefined) {
    conditions.push('rating <= ?');
    params.push(parseFloat(filters.rating_max));
  }

  // LIKE filters for partial matching
  if (filters.name_contains) {
    conditions.push('name LIKE ?');
    params.push(`%${filters.name_contains}%`);
  }

  const whereClause = conditions.length > 0 
    ? 'WHERE ' + conditions.join(' AND ')
    : '';

  return { whereClause, params };
}

/**
 * Get places with filters and pagination
 * @param {Object} filters - Filter object
 * @param {number} limit - Max results
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>}
 */
async function getPlaces(filters, limit = 100, offset = 0) {
  const { whereClause, params } = buildWhereClause(filters);
  
  const sql = `
    SELECT 
      id, place_id, name, site, type, phone, full_address,
      borough, street, city, state, county, county_code,
      latitude, longitude, rating, reviews, working_hours, about
    FROM places
    ${whereClause}
    ORDER BY id
    LIMIT ? OFFSET ?
  `;
  
  params.push(limit, offset);
  return await query(sql, params);
}

/**
 * Count places matching filters
 * @param {Object} filters - Filter object
 * @returns {Promise<number>}
 */
async function countPlaces(filters) {
  const { whereClause, params } = buildWhereClause(filters);
  
  const sql = `SELECT COUNT(*) as total FROM places ${whereClause}`;
  const result = await query(sql, params);
  return result[0].total;
}

/**
 * Stream places with filters using cursor
 * Returns a readable stream of results
 * @param {Object} filters - Filter object
 * @param {number} limit - Max results (0 = unlimited)
 * @returns {Promise<ReadableStream>}
 */
async function streamPlaces(filters, limit = 0) {
  const connection = await getConnection();
  const { whereClause, params } = buildWhereClause(filters);
  
  let sql = `
    SELECT 
      id, place_id, name, site, type, phone, full_address,
      borough, street, city, state, county, county_code,
      latitude, longitude, rating, reviews, working_hours, about
    FROM places
    ${whereClause}
    ORDER BY id
  `;
  
  if (limit > 0) {
    sql += ` LIMIT ${parseInt(limit)}`;
  }
  
  const stream = connection.connection.query(sql, params).stream();
  
  // Release connection when stream ends
  stream.on('end', () => connection.release());
  stream.on('error', () => connection.release());
  
  return stream;
}

/**
 * Get database statistics
 * @returns {Promise<Object>}
 */
async function getStats() {
  const [totalResult] = await query('SELECT COUNT(*) as total FROM places');
  const [cityStats] = await query(`
    SELECT city, COUNT(*) as count 
    FROM places 
    WHERE city IS NOT NULL 
    GROUP BY city 
    ORDER BY count DESC 
    LIMIT 10
  `);
  const [typeStats] = await query(`
    SELECT type, COUNT(*) as count 
    FROM places 
    WHERE type IS NOT NULL 
    GROUP BY type 
    ORDER BY count DESC 
    LIMIT 10
  `);
  const [countyCodeStats] = await query(`
    SELECT county_code, COUNT(*) as count 
    FROM places 
    WHERE county_code IS NOT NULL 
    GROUP BY county_code 
    ORDER BY count DESC 
    LIMIT 10
  `);

  return {
    total_places: totalResult.total,
    top_cities: cityStats,
    top_types: typeStats,
    top_county_codes: countyCodeStats
  };
}

/**
 * Test database connection
 * @returns {Promise<boolean>}
 */
async function testConnection() {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
}

module.exports = {
  query,
  getConnection,
  getPlaces,
  countPlaces,
  streamPlaces,
  getStats,
  testConnection,
  buildWhereClause
};
