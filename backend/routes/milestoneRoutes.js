const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const authenticateToken = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdmin");

// Get all milestones
router.get("/", async (req, res) => {
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
});

// Get milestone by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT * FROM milestones WHERE id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Milestone not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching milestone:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get user's milestone progress (requires authentication)
router.get("/user/progress", authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `
      SELECT 
        m.*,
        up.unlocked_at,
        CASE WHEN up.milestone_id IS NOT NULL THEN true ELSE false END as is_unlocked
      FROM milestones m
      LEFT JOIN user_progress up ON m.id = up.milestone_id AND up.user_id = $1
      ORDER BY m.year ASC
    `,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching user milestones:", err);
    res.status(500).json({ error: err.message });
  }
});

// Unlock a milestone (requires authentication)
router.post("/unlock/:milestoneId", authenticateToken, async (req, res) => {
  const { milestoneId } = req.params;
  const userId = req.user.id;

  try {
    // Check if milestone exists
    const milestone = await pool.query(
      `
      SELECT * FROM milestones WHERE id = $1
    `,
      [milestoneId]
    );

    if (milestone.rows.length === 0) {
      return res.status(404).json({ error: "Milestone not found" });
    }

    // Add to user progress (ignore if already exists)
    const result = await pool.query(
      `
      INSERT INTO user_progress (user_id, milestone_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, milestone_id) DO NOTHING
      RETURNING *
    `,
      [userId, milestoneId]
    );

    const wasNewlyUnlocked = result.rows.length > 0;

    res.json({
      message: wasNewlyUnlocked
        ? "Milestone unlocked!"
        : "Milestone already unlocked",
      milestone: milestone.rows[0],
      newlyUnlocked: wasNewlyUnlocked,
    });
  } catch (err) {
    console.error("Error unlocking milestone:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new milestone (Admin only)
router.post("/", authenticateToken, isAdmin, async (req, res) => {
  const { title, year, description, media_url, marker_id } = req.body;

  try {
    if (!title || !year || !description || !marker_id) {
      return res.status(400).json({
        error: "Required fields: title, year, description, marker_id",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO milestones (title, year, description, media_url, marker_id)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `,
      [title, year, description, media_url, marker_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      // Unique violation
      return res.status(400).json({ error: "Marker ID already exists" });
    }
    console.error("Error creating milestone:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update an existing milestone (Admin only)
router.put("/:id", authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, year, description, media_url, marker_id } = req.body;

  try {
    const result = await pool.query(
      `
      UPDATE milestones 
      SET title = $1, year = $2, description = $3, media_url = $4, marker_id = $5
      WHERE id = $6 RETURNING *
    `,
      [title, year, description, media_url, marker_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Milestone not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      // Unique violation
      return res.status(400).json({ error: "Marker ID already exists" });
    }
    console.error("Error updating milestone:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a milestone (Admin only)
router.delete("/:id", authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM milestones WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Milestone not found" });
    }

    res.json({ message: "Milestone deleted successfully" });
  } catch (err) {
    console.error("Error deleting milestone:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
