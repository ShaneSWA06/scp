const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const authenticateToken = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdmin");

const he = require("he");

const sanitizeOutput = (text) => {
  if (!text) return "";

  // Decode unicode escapes and then encode HTML
  let decoded = text.replace(/\\u([0-9A-Fa-f]{4})/g, (match, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  });

  // Remove any remaining HTML tags
  decoded = decoded.replace(/<[^>]*>/g, "");

  // HTML encode for safety
  return he.encode(decoded);
};

// Get all quizzes with milestone information
router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        q.*,
        m.title as milestone_title,
        m.year as milestone_year,
        m.description as milestone_description,
        CASE 
          WHEN m.year BETWEEN 1990 AND 1999 THEN '1990s'
          WHEN m.year BETWEEN 2000 AND 2009 THEN '2000s'
          WHEN m.year BETWEEN 2010 AND 2019 THEN '2010s'
          WHEN m.year BETWEEN 2020 AND 2029 THEN '2020s'
          ELSE 'Other'
        END as time_period
      FROM quizzes q
      JOIN milestones m ON q.milestone_id = m.id
      ORDER BY m.year ASC, q.id ASC
    `);

    // Sanitize all output data
    const sanitizedQuizzes = result.rows.map((quiz) => ({
      ...quiz,
      question: sanitizeOutput(quiz.question),
      correct_answer: sanitizeOutput(quiz.correct_answer),
      wrong_answer_1: sanitizeOutput(quiz.wrong_answer_1),
      wrong_answer_2: sanitizeOutput(quiz.wrong_answer_2),
      wrong_answer_3: sanitizeOutput(quiz.wrong_answer_3),
      milestone_title: sanitizeOutput(quiz.milestone_title),
      milestone_description: sanitizeOutput(quiz.milestone_description),
    }));

    console.log(
      `✅ Serving ${sanitizedQuizzes.length} sanitized quizzes to authenticated user`
    );
    res.json(sanitizedQuizzes);
  } catch (err) {
    console.error("Error fetching quizzes:", err);
    res.status(500).json({ error: "Failed to load quizzes" });
  }
});

// Get quizzes for a specific milestone
router.get("/milestone/:milestoneId", async (req, res) => {
  const { milestoneId } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT q.*, m.title as milestone_title, m.year as milestone_year
      FROM quizzes q
      JOIN milestones m ON q.milestone_id = m.id
      WHERE q.milestone_id = $1
      ORDER BY q.id ASC
    `,
      [milestoneId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching quizzes:", err);
    res.status(500).json({ error: err.message });
  }
});

// Submit quiz answer and track progress (requires authentication)
router.post("/submit", authenticateToken, async (req, res) => {
  const { quizId, selectedAnswer, timeTaken } = req.body;
  const userId = req.user.id;

  try {
    // Get the quiz and milestone information
    const quizResult = await pool.query(
      `
      SELECT q.*, m.id as milestone_id, m.title as milestone_title 
      FROM quizzes q
      JOIN milestones m ON q.milestone_id = m.id
      WHERE q.id = $1
    `,
      [quizId]
    );

    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const quiz = quizResult.rows[0];
    const isCorrect = selectedAnswer === quiz.correct_answer;

    // Record the quiz attempt
    await pool.query(
      `
      INSERT INTO quiz_attempts (user_id, quiz_id, selected_answer, is_correct, time_taken)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, quiz_id) 
      DO UPDATE SET 
        selected_answer = EXCLUDED.selected_answer,
        is_correct = EXCLUDED.is_correct,
        time_taken = EXCLUDED.time_taken,
        attempted_at = CURRENT_TIMESTAMP
    `,
      [userId, quizId, selectedAnswer, isCorrect, timeTaken || 0]
    );

    // If correct, unlock the milestone for the user
    if (isCorrect) {
      await pool.query(
        `
        INSERT INTO user_progress (user_id, milestone_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, milestone_id) DO NOTHING
      `,
        [userId, quiz.milestone_id]
      );
    }

    // Return result with explanation
    res.json({
      isCorrect,
      correctAnswer: quiz.correct_answer,
      explanation: `${quiz.milestone_title}: ${
        isCorrect ? "Correct!" : "Incorrect."
      } The right answer is "${quiz.correct_answer}".`,
      milestoneUnlocked: isCorrect,
    });
  } catch (err) {
    console.error("Error submitting quiz answer:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get user's quiz progress (requires authentication)
router.get("/progress", authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `
      SELECT 
        qa.*,
        q.question,
        q.correct_answer,
        m.title as milestone_title,
        m.year as milestone_year
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      JOIN milestones m ON q.milestone_id = m.id
      WHERE qa.user_id = $1
      ORDER BY qa.attempted_at DESC
    `,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching user quiz progress:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get user's quiz statistics (requires authentication)
router.get("/stats", authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const statsResult = await pool.query(
      `
      SELECT 
        COUNT(*) as total_attempted,
        COUNT(CASE WHEN is_correct THEN 1 END) as total_correct,
        ROUND(
          (COUNT(CASE WHEN is_correct THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
        ) as accuracy_percentage,
        AVG(time_taken) as average_time
      FROM quiz_attempts 
      WHERE user_id = $1
    `,
      [userId]
    );

    const progressResult = await pool.query(
      `
      SELECT COUNT(*) as milestones_unlocked
      FROM user_progress 
      WHERE user_id = $1
    `,
      [userId]
    );

    const totalMilestonesResult = await pool.query(`
      SELECT COUNT(*) as total_milestones
      FROM milestones
    `);

    const stats = {
      ...statsResult.rows[0],
      milestones_unlocked: parseInt(progressResult.rows[0].milestones_unlocked),
      total_milestones: parseInt(
        totalMilestonesResult.rows[0].total_milestones
      ),
    };

    res.json(stats);
  } catch (err) {
    console.error("Error fetching quiz stats:", err);
    res.status(500).json({ error: err.message });
  }
});

// Admin routes - Create quiz
router.post("/", authenticateToken, isAdmin, async (req, res) => {
  const {
    milestone_id,
    question,
    correct_answer,
    wrong_answer_1,
    wrong_answer_2,
    wrong_answer_3,
  } = req.body;

  try {
    // Sanitize inputs
    const sanitizedData = {
      milestone_id,
      question: he.encode(question || ""),
      correct_answer: he.encode(correct_answer || ""),
      wrong_answer_1: he.encode(wrong_answer_1 || ""),
      wrong_answer_2: he.encode(wrong_answer_2 || ""),
      wrong_answer_3: he.encode(wrong_answer_3 || ""),
    };

    // Validation
    if (!sanitizedData.question || sanitizedData.question.length < 5) {
      return res
        .status(400)
        .json({ error: "Question is required (min 5 characters)" });
    }

    // Check for dangerous patterns even in encoded form
    const dangerousPatterns = [
      /script/i,
      /javascript/i,
      /onload/i,
      /onerror/i,
      /onclick/i,
      /iframe/i,
    ];

    const allInputs = Object.values(sanitizedData);
    if (
      allInputs.some((input) =>
        dangerousPatterns.some((pattern) => pattern.test(input))
      )
    ) {
      return res
        .status(400)
        .json({ error: "Content contains potentially dangerous elements" });
    }

    const result = await pool.query(
      `INSERT INTO quizzes (milestone_id, question, correct_answer, wrong_answer_1, wrong_answer_2, wrong_answer_3)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        sanitizedData.milestone_id,
        sanitizedData.question,
        sanitizedData.correct_answer,
        sanitizedData.wrong_answer_1,
        sanitizedData.wrong_answer_2,
        sanitizedData.wrong_answer_3,
      ]
    );

    console.log("✅ Created sanitized quiz:", result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating quiz:", err);
    res.status(500).json({ error: "Failed to create quiz" });
  }
});

module.exports = router;
