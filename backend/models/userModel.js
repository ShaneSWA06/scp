const pool = require("../config/db");

// Create a new user
exports.createUser = async (username, email, hashedPassword) => {
  const result = await pool.query(
    `INSERT INTO users (username, email, password)
     VALUES ($1, $2, $3) RETURNING *`,
    [username, email, hashedPassword]
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
