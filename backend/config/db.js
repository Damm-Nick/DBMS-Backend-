// config/db.js
const mysql = require('mysql2');
require('dotenv').config();

// Create connection pool for better performance
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Get promise-based connection
const promisePool = pool.promise();

// Test database connection
const testConnection = async () => {
  try {
    const connection = await promisePool.getConnection();
    console.log('✅ MySQL Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

// Helper function to execute queries
const query = async (sql, params) => {
  try {
    const [results] = await promisePool.execute(sql, params);
    return results;
  } catch (error) {
    throw error;
  }
};

// Helper function to call stored procedures
const callProcedure = async (procedureName, params) => {
  try {
    const placeholders = params.map(() => '?').join(',');
    const sql = `CALL ${procedureName}(${placeholders})`;
    const [results] = await promisePool.execute(sql, params);
    return results;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  pool,
  promisePool,
  query,
  callProcedure,
  testConnection
};
