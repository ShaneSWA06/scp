const { Pool } = require("pg");
require("dotenv").config();

// Database connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: 5432,
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Test connection on startup
pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database");
});

pool.on("error", (err, client) => {
  console.error("❌ Unexpected error on idle client", err);
  process.exit(-1);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("🔄 Graceful shutdown initiated...");
  pool.end(() => {
    console.log("✅ Database connection pool closed");
    process.exit(0);
  });
});

module.exports = pool;
