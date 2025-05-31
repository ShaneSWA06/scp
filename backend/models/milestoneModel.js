const pool = require("../config/db");

// Create a new milestone
exports.createMilestone = async (
  title,
  year,
  description,
  mediaUrl,
  markerId
) => {
  const result = await pool.query(
    `INSERT INTO milestones (title, year, description, media_url, marker_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [title, year, description, mediaUrl, markerId]
  );
  return result.rows[0];
};

// Get all milestones
exports.getAllMilestones = async () => {
  const result = await pool.query(`
    SELECT * FROM milestones 
    ORDER BY year ASC
  `);
  return result.rows;
};

// Get milestone by ID
exports.getMilestoneById = async (milestoneId) => {
  const result = await pool.query(`SELECT * FROM milestones WHERE id = $1`, [
    milestoneId,
  ]);
  return result.rows[0];
};

// Get milestone by marker ID (for AR scanning)
exports.getMilestoneByMarkerId = async (markerId) => {
  const result = await pool.query(
    `SELECT * FROM milestones WHERE marker_id = $1`,
    [markerId]
  );
  return result.rows[0];
};

// Get milestones by time period
exports.getMilestonesByPeriod = async (startYear, endYear) => {
  const result = await pool.query(
    `SELECT * FROM milestones 
     WHERE year BETWEEN $1 AND $2 
     ORDER BY year ASC`,
    [startYear, endYear]
  );
  return result.rows;
};

// Update a milestone
exports.updateMilestone = async (
  milestoneId,
  title,
  year,
  description,
  mediaUrl,
  markerId
) => {
  const result = await pool.query(
    `UPDATE milestones 
     SET title = $1, year = $2, description = $3, media_url = $4, marker_id = $5
     WHERE id = $6 RETURNING *`,
    [title, year, description, mediaUrl, markerId, milestoneId]
  );
  return result.rows[0];
};

// Delete a milestone
exports.deleteMilestone = async (milestoneId) => {
  const result = await pool.query(
    `DELETE FROM milestones WHERE id = $1 RETURNING *`,
    [milestoneId]
  );
  return result.rows[0];
};

// Get user's milestone progress
exports.getUserMilestoneProgress = async (userId) => {
  const result = await pool.query(
    `SELECT 
       m.*,
       up.unlocked_at,
       CASE WHEN up.milestone_id IS NOT NULL THEN true ELSE false END as is_unlocked
     FROM milestones m
     LEFT JOIN user_progress up ON m.id = up.milestone_id AND up.user_id = $1
     ORDER BY m.year ASC`,
    [userId]
  );
  return result.rows;
};

// Unlock milestone for user
exports.unlockMilestoneForUser = async (userId, milestoneId) => {
  const result = await pool.query(
    `INSERT INTO user_progress (user_id, milestone_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, milestone_id) DO NOTHING
     RETURNING *`,
    [userId, milestoneId]
  );
  return result.rows[0];
};

// Check if user has unlocked milestone
exports.isUnlockedByUser = async (userId, milestoneId) => {
  const result = await pool.query(
    `SELECT * FROM user_progress 
     WHERE user_id = $1 AND milestone_id = $2`,
    [userId, milestoneId]
  );
  return result.rows.length > 0;
};

// Get milestone statistics
exports.getMilestoneStats = async () => {
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total_milestones,
      COUNT(CASE WHEN year BETWEEN 1990 AND 1999 THEN 1 END) as milestones_1990s,
      COUNT(CASE WHEN year BETWEEN 2000 AND 2009 THEN 1 END) as milestones_2000s,
      COUNT(CASE WHEN year BETWEEN 2010 AND 2019 THEN 1 END) as milestones_2010s,
      COUNT(CASE WHEN year BETWEEN 2020 AND 2029 THEN 1 END) as milestones_2020s,
      MIN(year) as earliest_year,
      MAX(year) as latest_year
    FROM milestones
  `);
  return result.rows[0];
};

// Get milestones with unlock count (admin analytics)
exports.getMilestonesWithAnalytics = async () => {
  const result = await pool.query(`
    SELECT 
      m.*,
      COUNT(up.user_id) as unlock_count,
      COUNT(DISTINCT up.user_id) as unique_users_unlocked
    FROM milestones m
    LEFT JOIN user_progress up ON m.id = up.milestone_id
    GROUP BY m.id, m.title, m.year, m.description, m.media_url, m.marker_id
    ORDER BY m.year ASC
  `);
  return result.rows;
};

// Get user progress by time period
exports.getUserProgressByPeriod = async (userId) => {
  const result = await pool.query(
    `SELECT 
       CASE 
         WHEN m.year BETWEEN 1990 AND 1999 THEN '1990s'
         WHEN m.year BETWEEN 2000 AND 2009 THEN '2000s'
         WHEN m.year BETWEEN 2010 AND 2019 THEN '2010s'
         WHEN m.year BETWEEN 2020 AND 2029 THEN '2020s'
         ELSE 'Other'
       END as time_period,
       COUNT(*) as unlocked_count
     FROM user_progress up
     JOIN milestones m ON up.milestone_id = m.id
     WHERE up.user_id = $1
     GROUP BY time_period`,
    [userId]
  );
  return result.rows;
};

// Get total milestones by time period
exports.getTotalMilestonesByPeriod = async () => {
  const result = await pool.query(`
    SELECT 
      CASE 
        WHEN year BETWEEN 1990 AND 1999 THEN '1990s'
        WHEN year BETWEEN 2000 AND 2009 THEN '2000s'
        WHEN year BETWEEN 2010 AND 2019 THEN '2010s'
        WHEN year BETWEEN 2020 AND 2029 THEN '2020s'
        ELSE 'Other'
      END as time_period,
      COUNT(*) as total_count
    FROM milestones
    GROUP BY time_period
  `);
  return result.rows;
};

// Check if marker ID exists
exports.markerIdExists = async (markerId, excludeId = null) => {
  let query = `SELECT id FROM milestones WHERE marker_id = $1`;
  let params = [markerId];

  if (excludeId) {
    query += ` AND id != $2`;
    params.push(excludeId);
  }

  const result = await pool.query(query, params);
  return result.rows.length > 0;
};
