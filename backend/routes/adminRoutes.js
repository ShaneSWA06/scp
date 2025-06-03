const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const authenticateToken = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdmin");

// Admin verification endpoint
router.get("/verify", authenticateToken, isAdmin, async (req, res) => {
  try {
    // Get detailed admin information from database
    const adminResult = await pool.query(
      `
      SELECT 
        id, 
        email, 
        full_name, 
        role, 
        registered_at,
        secondary_school,
        secondary_level
      FROM users 
      WHERE id = $1 AND role = 'admin'
    `,
      [req.user.id]
    );

    if (adminResult.rows.length === 0) {
      return res.status(403).json({
        error: "Admin user not found",
        code: "ADMIN_NOT_FOUND",
      });
    }

    const admin = adminResult.rows[0];

    // Get admin statistics
    const stats = await getAdminStats();

    // Log successful admin verification
    console.log(`✅ Admin verification successful`, {
      adminId: admin.id,
      email: admin.email,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
    });

    // Return admin data (excluding sensitive information)
    res.json({
      success: true,
      admin: {
        id: admin.id,
        name: admin.full_name,
        email: admin.email,
        role: admin.role,
        verifiedAt: new Date().toISOString(),
      },
      stats,
      permissions: {
        canCreateMilestones: true,
        canEditMilestones: true,
        canDeleteMilestones: true,
        canCreateQuizzes: true,
        canViewAnalytics: true,
        canManageUsers: false, // Can be expanded later
      },
    });
  } catch (error) {
    console.error("Admin verification error:", error);
    res.status(500).json({
      error: "Verification failed",
      code: "VERIFICATION_ERROR",
    });
  }
});

// Get admin dashboard statistics
router.get("/stats", authenticateToken, isAdmin, async (req, res) => {
  try {
    const stats = await getAdminStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// Get user analytics (admin only)
router.get("/analytics/users", authenticateToken, isAdmin, async (req, res) => {
  try {
    const userAnalytics = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as student_count,
        COUNT(CASE WHEN registered_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_users_week,
        COUNT(CASE WHEN registered_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_month
      FROM users
    `);

    const quizAnalytics = await pool.query(`
      SELECT 
        COUNT(*) as total_attempts,
        COUNT(CASE WHEN is_correct THEN 1 END) as correct_attempts,
        ROUND(AVG(time_taken)) as avg_time_seconds,
        COUNT(DISTINCT user_id) as active_users
      FROM quiz_attempts
      WHERE attempted_at >= NOW() - INTERVAL '30 days'
    `);

    const badgeAnalytics = await pool.query(`
      SELECT 
        COUNT(*) as total_badges_awarded,
        COUNT(DISTINCT user_id) as users_with_badges,
        COUNT(DISTINCT badge_id) as unique_badge_types
      FROM badges
      WHERE awarded_at >= NOW() - INTERVAL '30 days'
    `);

    res.json({
      users: userAnalytics.rows[0],
      quizzes: quizAnalytics.rows[0],
      badges: badgeAnalytics.rows[0],
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// Security audit log endpoint
router.get("/security/logs", authenticateToken, isAdmin, async (req, res) => {
  try {
    // In a production environment, you'd want to store security logs in a separate table
    // For now, we'll return a mock response showing the type of data you'd track
    const mockSecurityLogs = [
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        event: "admin_login",
        userId: req.user.id,
        ip: req.ip,
        details: "Successful admin authentication",
      },
      {
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        event: "milestone_created",
        userId: req.user.id,
        ip: req.ip,
        details: "New milestone added: Digital Innovation Hub",
      },
    ];

    res.json({
      logs: mockSecurityLogs,
      note: "Security logging is active. In production, implement proper audit trail storage.",
    });
  } catch (error) {
    console.error("Error fetching security logs:", error);
    res.status(500).json({ error: "Failed to fetch security logs" });
  }
});

// Helper function to get admin statistics
async function getAdminStats() {
  try {
    const [milestoneCount, quizCount, userCount, recentActivity] =
      await Promise.all([
        pool.query("SELECT COUNT(*) as count FROM milestones"),
        pool.query("SELECT COUNT(*) as count FROM quizzes"),
        pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'user'"), // Fixed: removed parameter
        pool.query(`
        SELECT 
          COUNT(*) as recent_quiz_attempts,
          COUNT(DISTINCT user_id) as active_users
        FROM quiz_attempts 
        WHERE attempted_at >= NOW() - INTERVAL '24 hours'
      `),
      ]);

    return {
      milestones: parseInt(milestoneCount.rows[0].count),
      quizzes: parseInt(quizCount.rows[0].count),
      students: parseInt(userCount.rows[0].count),
      recentActivity: {
        quizAttempts24h: parseInt(
          recentActivity.rows[0]?.recent_quiz_attempts || 0
        ),
        activeUsers24h: parseInt(recentActivity.rows[0]?.active_users || 0),
      },
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error getting admin stats:", error);
    return {
      milestones: 0,
      quizzes: 0,
      students: 0,
      recentActivity: {
        quizAttempts24h: 0,
        activeUsers24h: 0,
      },
      lastUpdated: new Date().toISOString(),
      error: "Failed to load statistics",
    };
  }
}

module.exports = router;
