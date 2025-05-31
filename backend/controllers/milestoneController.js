const pool = require("../config/db");

// Get all milestones
exports.getAllMilestones = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM milestones 
      ORDER BY year ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching milestones:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get milestone by ID
exports.getMilestoneById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`SELECT * FROM milestones WHERE id = $1`, [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Milestone not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching milestone:", err);
    res.status(500).json({ error: err.message });
  }
};

// Create a new milestone (Admin only)
exports.createMilestone = async (req, res) => {
  const { title, year, description, media_url, marker_id } = req.body;

  try {
    if (!title || !year || !description || !marker_id) {
      return res.status(400).json({
        error: "Required fields: title, year, description, marker_id",
      });
    }

    const result = await pool.query(
      `INSERT INTO milestones (title, year, description, media_url, marker_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, year, description, media_url || "", marker_id]
    );

    // Log admin action
    try {
      await pool.query(
        `INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.user.id,
          "CREATE_MILESTONE",
          "milestone",
          result.rows[0].id,
          JSON.stringify({ title, year, marker_id }),
          req.ip,
        ]
      );
    } catch (logError) {
      console.warn("Failed to log admin action:", logError);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "Marker ID already exists" });
    }
    console.error("Error creating milestone:", err);
    res.status(500).json({ error: err.message });
  }
};

// Update an existing milestone (Admin only)
exports.updateMilestone = async (req, res) => {
  const { id } = req.params;
  const { title, year, description, media_url, marker_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE milestones 
       SET title = $1, year = $2, description = $3, media_url = $4, marker_id = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 RETURNING *`,
      [title, year, description, media_url || "", marker_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Milestone not found" });
    }

    // Log admin action
    try {
      await pool.query(
        `INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.user.id,
          "UPDATE_MILESTONE",
          "milestone",
          id,
          JSON.stringify({ title, year, marker_id }),
          req.ip,
        ]
      );
    } catch (logError) {
      console.warn("Failed to log admin action:", logError);
    }

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "Marker ID already exists" });
    }
    console.error("Error updating milestone:", err);
    res.status(500).json({ error: err.message });
  }
};

// Delete a milestone (Admin only)
exports.deleteMilestone = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM milestones WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Milestone not found" });
    }

    // Log admin action
    try {
      await pool.query(
        `INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.user.id,
          "DELETE_MILESTONE",
          "milestone",
          id,
          JSON.stringify({ title: result.rows[0].title }),
          req.ip,
        ]
      );
    } catch (logError) {
      console.warn("Failed to log admin action:", logError);
    }

    res.json({ message: "Milestone deleted successfully" });
  } catch (err) {
    console.error("Error deleting milestone:", err);
    res.status(500).json({ error: err.message });
  }
};
