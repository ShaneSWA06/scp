const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const authenticateToken = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdmin");

// Get all resources for admin (requires admin auth)
router.get("/admin/all", authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.*,
        m.title as milestone_title,
        m.year as milestone_year
      FROM resources r
      JOIN milestones m ON r.milestone_id = m.id
      ORDER BY m.year ASC, r.display_order ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching admin resources:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get active resources for a specific milestone (public access for authenticated users)
router.get("/milestone/:milestoneId", authenticateToken, async (req, res) => {
  const { milestoneId } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT 
        r.*,
        m.title as milestone_title,
        m.year as milestone_year
      FROM resources r
      JOIN milestones m ON r.milestone_id = m.id
      WHERE r.milestone_id = $1 AND r.is_active = true
      ORDER BY r.display_order ASC
    `,
      [milestoneId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching milestone resources:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create new resource (Admin only)
router.post("/", authenticateToken, isAdmin, async (req, res) => {
  const {
    milestone_id,
    resource_type,
    title,
    description,
    url,
    content,
    display_order,
    is_active,
  } = req.body;

  try {
    // Validation
    if (!milestone_id || !resource_type || !title) {
      return res.status(400).json({
        error: "Required fields: milestone_id, resource_type, title",
      });
    }

    // Validate resource type
    const validTypes = ["article", "video", "document", "link", "text"];
    if (!validTypes.includes(resource_type)) {
      return res.status(400).json({
        error:
          "Invalid resource type. Must be: article, video, document, link, or text",
      });
    }

    // Validate that milestone exists
    const milestoneCheck = await pool.query(
      "SELECT id FROM milestones WHERE id = $1",
      [milestone_id]
    );

    if (milestoneCheck.rows.length === 0) {
      return res.status(400).json({ error: "Milestone not found" });
    }

    const result = await pool.query(
      `INSERT INTO resources 
       (milestone_id, resource_type, title, description, url, content, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        milestone_id,
        resource_type,
        title,
        description || null,
        url || null,
        content || null,
        display_order || 0,
        is_active !== undefined ? is_active : true,
      ]
    );

    console.log("✅ Created resource:", result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating resource:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update resource (Admin only)
router.put("/:id", authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    milestone_id,
    resource_type,
    title,
    description,
    url,
    content,
    display_order,
    is_active,
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE resources 
       SET milestone_id = $1, resource_type = $2, title = $3, description = $4, 
           url = $5, content = $6, display_order = $7, is_active = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 
       RETURNING *`,
      [
        milestone_id,
        resource_type,
        title,
        description,
        url,
        content,
        display_order,
        is_active,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Resource not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating resource:", err);
    res.status(500).json({ error: err.message });
  }
});

// Toggle resource active status (Admin only)
router.patch("/:id/toggle", authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE resources 
       SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Resource not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error toggling resource status:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete resource (Admin only)
router.delete("/:id", authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM resources WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Resource not found" });
    }

    res.json({ message: "Resource deleted successfully" });
  } catch (err) {
    console.error("Error deleting resource:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
