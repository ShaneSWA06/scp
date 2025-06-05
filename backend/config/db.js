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
    console.log("⚠️  IMPORTANT: Change this password after first login!");

    return result.rows[0];
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
  }
};
module.exports = pool;
