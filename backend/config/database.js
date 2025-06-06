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
    console.log("🔄 Starting database setup...");

    // Create tables with ALL required columns
    await client.query(`
      -- Drop existing tables (use with caution in production!)
      DROP TABLE IF EXISTS admin_logs CASCADE;
      DROP TABLE IF EXISTS badges CASCADE;
      DROP TABLE IF EXISTS quiz_attempts CASCADE;
      DROP TABLE IF EXISTS user_progress CASCADE;
      DROP TABLE IF EXISTS resources CASCADE;
      DROP TABLE IF EXISTS quizzes CASCADE;
      DROP TABLE IF EXISTS milestones CASCADE;
      DROP TABLE IF EXISTS users CASCADE;

      -- Create users table
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

      -- Create milestones table
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

      -- Create quizzes table
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

      -- Create resources table
      CREATE TABLE IF NOT EXISTS resources (
        id SERIAL PRIMARY KEY,
        milestone_id INTEGER REFERENCES milestones(id) ON DELETE CASCADE,
        resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('article', 'video', 'document', 'link', 'text')),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        url TEXT,
        content TEXT,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create user_progress table
      CREATE TABLE IF NOT EXISTS user_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        milestone_id INTEGER REFERENCES milestones(id) ON DELETE CASCADE,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, milestone_id)
      );

      -- Create quiz_attempts table
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

      -- Create badges table
      CREATE TABLE IF NOT EXISTS badges (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        badge_id VARCHAR(50) NOT NULL,
        badge_name VARCHAR(100) NOT NULL,
        awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create admin_logs table
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
      CREATE INDEX IF NOT EXISTS idx_milestones_year ON milestones(year);
      CREATE INDEX IF NOT EXISTS idx_quizzes_milestone ON quizzes(milestone_id);
      CREATE INDEX IF NOT EXISTS idx_resources_milestone ON resources(milestone_id);
      CREATE INDEX IF NOT EXISTS idx_resources_active ON resources(is_active);
      CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
      CREATE INDEX IF NOT EXISTS idx_badges_user ON badges(user_id);
      CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);
    `);

    console.log("✅ PostgreSQL tables created successfully");

    // CREATE ADMIN USER AUTOMATICALLY
    await createAdminUser(client);

    // INSERT SAMPLE DATA
    await insertSampleData(client);

    client.release();
    console.log("🎉 Database setup completed successfully!");
  } catch (err) {
    console.error("❌ Error setting up PostgreSQL:", err);
    process.exit(1);
  }
};

// Function to create admin user
const createAdminUser = async (client) => {
  try {
    console.log("🔄 Creating admin user...");

    // Check if admin already exists
    const adminCheck = await client.query(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );

    if (adminCheck.rows.length > 0) {
      console.log("✅ Admin user already exists");
      return;
    }

    // Admin credentials (you can change these)

    const adminName = "System Administrator";

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Insert admin user
    const result = await client.query(
      `INSERT INTO users (email, password, full_name, secondary_school, secondary_level, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, role`,
      [adminEmail, hashedPassword, adminName, "NUS", "Admin", "admin"]
    );

    console.log("🎉 ADMIN USER CREATED SUCCESSFULLY!");
    console.log("⚠️  IMPORTANT: Change this password after first login!");

    return result.rows[0];
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
  }
};

// Function to insert sample data
const insertSampleData = async (client) => {
  try {
    console.log("🔄 Inserting sample data...");

    // Check if sample data already exists
    const existingMilestones = await client.query(
      "SELECT COUNT(*) FROM milestones"
    );

    if (parseInt(existingMilestones.rows[0].count) > 0) {
      console.log("✅ Sample data already exists");
      return;
    }

    // Insert sample milestones
    const milestones = [
      {
        title: "SoC Establishment",
        year: 2001,
        description:
          "The School of Computing was officially established as part of the National University of Singapore, marking the beginning of formal computer science education in Singapore.",
        media_url:
          "https://images.unsplash.com/photo-1562774053-701939374585?w=800",
        marker_id: "SOC_2001",
      },
      {
        title: "First PhD Graduates",
        year: 2005,
        description:
          "SoC produced its first batch of PhD graduates, establishing itself as a research powerhouse in Southeast Asia.",
        media_url:
          "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800",
        marker_id: "PHD_2005",
      },
      {
        title: "New SoC Building",
        year: 2012,
        description:
          "The iconic SoC building was completed, providing state-of-the-art facilities for students and faculty.",
        media_url:
          "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=800",
        marker_id: "BUILDING_2012",
      },
      {
        title: "AI Research Center",
        year: 2020,
        description:
          "Launch of the dedicated AI research center, focusing on machine learning and artificial intelligence applications.",
        media_url:
          "https://images.unsplash.com/photo-1555255707-c07966088b7b?w=800",
        marker_id: "AI_2020",
      },
    ];

    for (const milestone of milestones) {
      await client.query(
        `INSERT INTO milestones (title, year, description, media_url, marker_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          milestone.title,
          milestone.year,
          milestone.description,
          milestone.media_url,
          milestone.marker_id,
        ]
      );
    }

    // Insert sample quizzes
    const quizzes = [
      {
        milestone_id: 1,
        question: "When was the School of Computing officially established?",
        correct_answer: "2001",
        wrong_answer_1: "2000",
        wrong_answer_2: "2002",
        wrong_answer_3: "1999",
      },
      {
        milestone_id: 2,
        question: "What significant academic achievement occurred in 2005?",
        correct_answer: "First PhD graduates",
        wrong_answer_1: "First undergraduate program",
        wrong_answer_2: "First research paper",
        wrong_answer_3: "First international collaboration",
      },
      {
        milestone_id: 3,
        question: "What major infrastructure development happened in 2012?",
        correct_answer: "New SoC building completion",
        wrong_answer_1: "New library opening",
        wrong_answer_2: "New parking lot",
        wrong_answer_3: "New cafeteria",
      },
      {
        milestone_id: 4,
        question: "Which research center was launched in 2020?",
        correct_answer: "AI Research Center",
        wrong_answer_1: "Cybersecurity Center",
        wrong_answer_2: "Data Science Lab",
        wrong_answer_3: "Robotics Institute",
      },
    ];

    for (const quiz of quizzes) {
      await client.query(
        `INSERT INTO quizzes (milestone_id, question, correct_answer, wrong_answer_1, wrong_answer_2, wrong_answer_3)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          quiz.milestone_id,
          quiz.question,
          quiz.correct_answer,
          quiz.wrong_answer_1,
          quiz.wrong_answer_2,
          quiz.wrong_answer_3,
        ]
      );
    }

    // Insert sample resources
    const resources = [
      {
        milestone_id: 1,
        resource_type: "article",
        title: "History of SoC",
        description:
          "Learn about the founding and early years of the School of Computing",
        url: "https://www.comp.nus.edu.sg/about/our-history/",
        display_order: 1,
      },
      {
        milestone_id: 1,
        resource_type: "text",
        title: "Founding Vision",
        description: "The vision behind establishing SoC",
        content:
          "The School of Computing was established with the vision of becoming a leading center for computing education and research in Asia. The founding members aimed to create an institution that would bridge theoretical computer science with practical applications.",
        display_order: 2,
      },
    ];

    for (const resource of resources) {
      await client.query(
        `INSERT INTO resources (milestone_id, resource_type, title, description, url, content, display_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          resource.milestone_id,
          resource.resource_type,
          resource.title,
          resource.description,
          resource.url || null,
          resource.content || null,
          resource.display_order,
          true,
        ]
      );
    }

    console.log("✅ Sample data inserted successfully");
    console.log("📊 Created:");
    console.log("   - 4 milestones");
    console.log("   - 4 quiz questions");
    console.log("   - 2 learning resources");
  } catch (error) {
    console.error("❌ Error inserting sample data:", error);
  }
};

// Main execution
const main = async () => {
  console.log("🚀 Starting SoC AR Time Machine Database Setup");
  console.log("=".repeat(50));

  await createTables();

  console.log("=".repeat(50));
  console.log("✅ Database setup complete! You can now start your server.");

  process.exit(0);
};

// Run if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Database setup failed:", error);
    process.exit(1);
  });
}

module.exports = { createTables, pool };
