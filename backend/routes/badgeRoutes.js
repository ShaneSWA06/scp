const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const authenticateToken = require("../middleware/authMiddleware");

// All badge routes require authentication
router.use(authenticateToken);

// Badge definitions
const BADGE_DEFINITIONS = {
  pioneer_90s: {
    name: "Pioneer Era",
    description: "Explored the founding years of SoC (1990s)",
    icon: "🏆",
    rarity: "common",
    requirement_type: "time_period",
    requirement_value: "1990s",
  },
  digital_2000s: {
    name: "Digital Revolution",
    description: "Witnessed the digital transformation (2000s)",
    icon: "💻",
    rarity: "common",
    requirement_type: "time_period",
    requirement_value: "2000s",
  },
  innovation_2010s: {
    name: "Innovation Leader",
    description: "Explored the innovation boom (2010s)",
    icon: "🚀",
    rarity: "rare",
    requirement_type: "time_period",
    requirement_value: "2010s",
  },
  future_2020s: {
    name: "Future Vision",
    description: "Discovered the modern era (2020s)",
    icon: "🌟",
    rarity: "rare",
    requirement_type: "time_period",
    requirement_value: "2020s",
  },
  time_master: {
    name: "Time Master",
    description: "Mastered the complete SoC timeline",
    icon: "⚡",
    rarity: "legendary",
    requirement_type: "all_milestones",
    requirement_value: null,
  },
  quiz_expert: {
    name: "Knowledge Expert",
    description: "Answered 80% of questions correctly",
    icon: "🧠",
    rarity: "epic",
    requirement_type: "accuracy",
    requirement_value: 80,
  },
};

// Get all badges with user's earned status
router.get("/", async (req, res) => {
  const userId = req.user.id;

  try {
    // Get user's earned badges
    const earnedBadgesResult = await pool.query(
      `
      SELECT badge_id, awarded_at 
      FROM badges 
      WHERE user_id = $1
    `,
      [userId]
    );

    const earnedBadges = earnedBadgesResult.rows.reduce((acc, badge) => {
      acc[badge.badge_id] = badge.awarded_at;
      return acc;
    }, {});

    // Combine badge definitions with earned status
    const badges = Object.entries(BADGE_DEFINITIONS).map(
      ([badgeId, definition]) => {
        const isEarned = !!earnedBadges[badgeId];

        return {
          id: badgeId,
          ...definition,
          isEarned,
          earnedAt: earnedBadges[badgeId] || null,
          progress: { current: isEarned ? 1 : 0, total: 1 },
        };
      }
    );

    res.json(badges);
  } catch (err) {
    console.error("Error fetching user badges:", err);
    res.status(500).json({ error: err.message });
  }
});

// Check and award badges for a user
router.post("/check", async (req, res) => {
  const userId = req.user.id;

  try {
    // Get user's progress data
    const quizStats = await pool.query(
      `
      SELECT 
        COUNT(*) as total_attempts,
        COUNT(CASE WHEN is_correct THEN 1 END) as correct_answers,
        ROUND(
          (COUNT(CASE WHEN is_correct THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
        ) as accuracy
      FROM quiz_attempts 
      WHERE user_id = $1
    `,
      [userId]
    );

    const milestoneProgress = await pool.query(
      `
      SELECT 
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
      GROUP BY time_period
    `,
      [userId]
    );

    const totalUnlocked = await pool.query(
      `
      SELECT COUNT(*) as total_unlocked
      FROM user_progress
      WHERE user_id = $1
    `,
      [userId]
    );

    const totalMilestones = await pool.query(`
      SELECT COUNT(*) as total_milestones
      FROM milestones
    `);

    const newBadges = [];
    const stats = quizStats.rows[0];
    const progressByPeriod = milestoneProgress.rows;

    // Check accuracy badge
    if (stats.accuracy >= 80 && stats.total_attempts > 0) {
      const existingBadge = await pool.query(
        `
        SELECT id FROM badges WHERE user_id = $1 AND badge_id = 'quiz_expert'
      `,
        [userId]
      );

      if (existingBadge.rows.length === 0) {
        await pool.query(
          `
          INSERT INTO badges (user_id, badge_id, badge_name)
          VALUES ($1, 'quiz_expert', 'Knowledge Expert')
        `,
          [userId]
        );

        newBadges.push({
          id: "quiz_expert",
          ...BADGE_DEFINITIONS.quiz_expert,
          earnedAt: new Date(),
        });
      }
    }

    // Check time period badges
    for (const period of progressByPeriod) {
      const badgeId = `${period.time_period.slice(
        0,
        -1
      )}_${period.time_period.slice(-2)}`.toLowerCase();

      if (BADGE_DEFINITIONS[badgeId] && period.unlocked_count > 0) {
        const existingBadge = await pool.query(
          `
          SELECT id FROM badges WHERE user_id = $1 AND badge_id = $2
        `,
          [userId, badgeId]
        );

        if (existingBadge.rows.length === 0) {
          await pool.query(
            `
            INSERT INTO badges (user_id, badge_id, badge_name)
            VALUES ($1, $2, $3)
          `,
            [userId, badgeId, BADGE_DEFINITIONS[badgeId].name]
          );

          newBadges.push({
            id: badgeId,
            ...BADGE_DEFINITIONS[badgeId],
            earnedAt: new Date(),
          });
        }
      }
    }

    res.json({
      message: `${newBadges.length} new badge(s) awarded`,
      newBadges,
    });
  } catch (err) {
    console.error("Error checking badges:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get badge collection statistics
router.get("/stats", async (req, res) => {
  const userId = req.user.id;

  try {
    const earnedCount = await pool.query(
      `
      SELECT COUNT(*) as earned_count
      FROM badges 
      WHERE user_id = $1
    `,
      [userId]
    );

    const totalCount = Object.keys(BADGE_DEFINITIONS).length;
    const earned = parseInt(earnedCount.rows[0].earned_count);
    const percentage = Math.round((earned / totalCount) * 100);

    const recentBadges = await pool.query(
      `
      SELECT badge_id, badge_name, awarded_at
      FROM badges 
      WHERE user_id = $1
      ORDER BY awarded_at DESC
      LIMIT 5
    `,
      [userId]
    );

    res.json({
      earned,
      total: totalCount,
      percentage,
      recentBadges: recentBadges.rows.map((badge) => ({
        id: badge.badge_id,
        name: badge.badge_name,
        earnedAt: badge.awarded_at,
        ...BADGE_DEFINITIONS[badge.badge_id],
      })),
    });
  } catch (err) {
    console.error("Error fetching badge stats:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
