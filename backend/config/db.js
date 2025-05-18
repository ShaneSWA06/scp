const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  max: process.env.DB_CONNECTION_LIMIT || 10,
  port: 5432, // default PostgreSQL port
});

const createTables = async () => {
  try {
    // Connect to DB
    const client = await pool.connect();

    // Run SQL commands
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  secondary_school VARCHAR(100),
  secondary_level VARCHAR(20),
  role VARCHAR(20) DEFAULT 'user',
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS milestones (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL,
  description TEXT NOT NULL,
  media_url TEXT NOT NULL,
  marker_id VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS quizzes (
  id SERIAL PRIMARY KEY,
  milestone_id INTEGER REFERENCES milestones(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  wrong_answer_1 TEXT NOT NULL,
  wrong_answer_2 TEXT NOT NULL,
  wrong_answer_3 TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  milestone_id INTEGER REFERENCES milestones(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, milestone_id)
);

CREATE TABLE IF NOT EXISTS badges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  badge_name VARCHAR(100) NOT NULL,
  awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

    `);

    console.log("✅ PostgreSQL connected and tables created");
    client.release();
  } catch (err) {
    console.error("❌ Error setting up PostgreSQL:", err);
  }
};

createTables();

module.exports = pool;
