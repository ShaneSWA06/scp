const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

const createTables = async () => {
  try {
    const client = await pool.connect();

    // Create tables with ALL required columns
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        secondary_school VARCHAR(100),
        secondary_level VARCHAR(20),
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP
      );

      -- Add missing columns if they don't exist (for existing databases)
      DO $$ 
      BEGIN 
        -- Add role column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='role') THEN
          ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user' 
          CHECK (role IN ('user', 'admin'));
        END IF;
        
        -- Add last_login column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='last_login') THEN
          ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
        END IF;
        
        -- Add failed_login_attempts column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='failed_login_attempts') THEN
          ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
        END IF;
        
        -- Add locked_until column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='locked_until') THEN
          ALTER TABLE users ADD COLUMN locked_until TIMESTAMP;
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS milestones (
        id SERIAL PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        year INTEGER NOT NULL,
        description TEXT NOT NULL,
        media_url TEXT,
        marker_id VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS quizzes (
        id SERIAL PRIMARY KEY,
        milestone_id INTEGER REFERENCES milestones(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        wrong_answer_1 TEXT NOT NULL,
        wrong_answer_2 TEXT NOT NULL,
        wrong_answer_3 TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        milestone_id INTEGER REFERENCES milestones(id) ON DELETE CASCADE,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, milestone_id)
      );

      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
        selected_answer TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL,
        time_taken INTEGER DEFAULT 0,
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, quiz_id)
      );

      CREATE TABLE IF NOT EXISTS badges (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        badge_id VARCHAR(50) NOT NULL,
        badge_name VARCHAR(100) NOT NULL,
        awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admin_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id INTEGER,
        details JSONB,
        ip_address INET,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
      CREATE INDEX IF NOT EXISTS idx_badges_user ON badges(user_id);
      CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);
    `);

    console.log("✅ PostgreSQL connected and tables created/updated");

    // CREATE ADMIN USER AUTOMATICALLY
    await createAdminUser(client);

    client.release();
  } catch (err) {
    console.error("❌ Error setting up PostgreSQL:", err);
  }
};

// Function to create admin user
const createAdminUser = async (client) => {
  try {
    // Check if admin already exists
    const adminCheck = await client.query(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );

    if (adminCheck.rows.length > 0) {
      console.log("✅ Admin user already exists");
      return;
    }

    // Admin credentials (you can change these)
    const adminEmail = "admin@socar.com";
    const adminPassword = "AdminPassword123!"; // Change this!
    const adminName = "System Administrator";

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Insert admin user
    const result = await client.query(
      `INSERT INTO users (email, password, full_name, secondary_school, secondary_level, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, role`,
      [adminEmail, hashedPassword, adminName, null, null, "admin"]
    );

    console.log("🎉 ADMIN USER CREATED SUCCESSFULLY!");
    console.log("📧 Email:", adminEmail);
    console.log("🔒 Password:", adminPassword);
    console.log("⚠️  IMPORTANT: Change this password after first login!");

    return result.rows[0];
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
  }
};

createTables();
module.exports = pool;
