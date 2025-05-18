const pool = require("../config/db");

// Create a new user
exports.createUser = async (
  full_name,
  email,
  hashedPassword,
  secondary_school,
  secondary_level
) => {
  const result = await pool.query(
    `INSERT INTO users (email, password, full_name, secondary_school, secondary_level)
   VALUES ($1, $2, $3, $4, $5)`,
    [email, hashedPassword, full_name, secondary_school, secondary_level]
  );
  return result.rows[0];
};

// Find user by email
exports.findUserByEmail = async (email) => {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  return result.rows[0];
};
