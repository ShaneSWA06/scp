import React, { useState, useEffect } from "react";
import { useNavigate, userLocation } from "react-router-dom";
import axios from "axios";
import DOMPurify from "dompurify";
import "./Features.css";

const sanitizeContent = (content) => {
  if (!content) return "";
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true, // Keep text content only
  });
};

const Quiz = () => {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [completedQuizzes, setCompletedQuizzes] = useState([]);
  const [isCorrect, setIsCorrect] = useState(false);
  const [quizData, setQuizData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState(null);
  const [startTime, setStartTime] = useState(null);

  // Check authentication on component mount
  useEffect(() => {
    if (!token) {
      alert("Please login to access the quiz feature");
      navigate("/login");
      return;
    }

    fetchQuizData();
    fetchUserStats();
  }, [token, navigate]);

  const isNewQuiz = (createdAt) => {
    if (!createdAt) return false;
    try {
      const created = new Date(createdAt);
      const now = new Date();
      const hoursDiff = (now - created) / (1000 * 60 * 60);
      return hoursDiff < 24; // Mark as new if created within 24 hours
    } catch (error) {
      console.error("Error checking if quiz is new:", error);
      return false;
    }
  };

  // Fetch quiz data from backend
  const fetchQuizData = async () => {
    try {
      setLoading(true);
      console.log("🔄 Fetching latest quizzes...");

      // GET TOKEN FROM LOCALSTORAGE
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        navigate("/login");
        return;
      }

      // ADD AUTHORIZATION HEADER
      const response = await axios.get("http://localhost:5000/quizzes", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const quizzes = response.data;
      console.log(`📊 Loaded ${quizzes.length} quizzes from admin`);

      // Transform quizzes with milestone media support
      const transformedQuizzes = quizzes.map((quiz) => ({
        id: quiz.id,
        milestone: `${quiz.milestone_title} (${quiz.milestone_year})`,
        question: quiz.question,
        milestone_media_url: quiz.milestone_media_url, // Use milestone media instead of separate quiz images
        options: [
          quiz.correct_answer,
          quiz.wrong_answer_1,
          quiz.wrong_answer_2,
          quiz.wrong_answer_3,
        ].sort(() => Math.random() - 0.5),
        correctAnswer: quiz.correct_answer,
        explanation: `${quiz.milestone_title}: This milestone occurred in ${
          quiz.milestone_year
        }. ${quiz.milestone_description || ""}`,
        timePeriod: quiz.time_period || getTimePeriod(quiz.milestone_year),
        difficulty: getDifficulty(quiz.milestone_year),
        milestoneId: quiz.milestone_id,
        createdAt: quiz.quiz_created_at,
        isNew: isNewQuiz(quiz.quiz_created_at),
      }));

      setQuizData(transformedQuizzes);

      // Fetch user progress if authenticated
      if (token) {
        try {
          const progressResponse = await axios.get(
            "http://localhost:5000/quizzes/progress",
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const completedIds = progressResponse.data.map(
            (attempt) => attempt.quiz_id
          );
          setCompletedQuizzes(completedIds);

          console.log(`✅ User has completed ${completedIds.length} quizzes`);
        } catch (err) {
          console.log("No progress data yet");
        }
      }
    } catch (error) {
      console.error("Error fetching quiz data:", error);

      // Handle specific authentication errors
      if (error.response?.status === 401) {
        alert("Your session has expired. Please login again.");
        localStorage.removeItem("token");
        navigate("/login");
      } else {
        alert("Error loading quiz data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch user statistics
  const fetchUserStats = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await axios.get("http://localhost:5000/quizzes/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserStats(response.data);
    } catch (error) {
      console.log("No stats available yet");
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    }
  };

  // Helper functions
  const getTimePeriod = (year) => {
    if (year >= 1990 && year <= 1999) return "1990s";
    if (year >= 2000 && year <= 2009) return "2000s";
    if (year >= 2010 && year <= 2019) return "2010s";
    if (year >= 2020 && year <= 2029) return "2020s";
    return "Other";
  };

  const getDifficulty = (year) => {
    if (year <= 2000) return "easy";
    if (year <= 2010) return "medium";
    return "hard";
  };

  const startQuiz = (quiz) => {
    setCurrentQuiz(quiz);
    setSelectedAnswer("");
    setShowResult(false);
    setIsCorrect(false);
    setStartTime(Date.now());
  };

  const submitAnswer = async () => {
    if (!selectedAnswer || !token) return;

    if (!token) {
      alert("Please login to submit answers");
      navigate("/login");
      return;
    }

    try {
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);

      const response = await axios.post(
        "http://localhost:5000/quizzes/submit",
        {
          quizId: currentQuiz.id,
          selectedAnswer: selectedAnswer,
          timeTaken: timeTaken,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Handle quiz result
      const result = response.data;
      setIsCorrect(result.isCorrect);
      setShowResult(true);

      if (result.isCorrect) {
        setScore(score + 1);
        if (!completedQuizzes.includes(currentQuiz.id)) {
          setCompletedQuizzes([...completedQuizzes, currentQuiz.id]);
        }
      } else {
        // NEW: Navigate to resources page for wrong answers
        setTimeout(() => {
          navigate("/resources", {
            state: {
              milestone: {
                ...currentQuiz,
                selectedAnswer: selectedAnswer,
                correctAnswer: currentQuiz.correctAnswer,
                explanation: currentQuiz.explanation,
              },
            },
          });
        }, 3000); // Show result for 3 seconds, then redirect
      }

      // Refresh user stats and check for badges
      fetchUserStats();

      // Check for new badges
      try {
        const badgeResponse = await axios.post(
          "http://localhost:5000/badges/check",
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (
          badgeResponse.data.newBadges &&
          badgeResponse.data.newBadges.length > 0
        ) {
          setTimeout(() => {
            alert(
              `🏆 CONGRATULATIONS! You've earned ${badgeResponse.data.newBadges.length} new badge(s)!`
            );
          }, 1000);
        }
      } catch (err) {
        console.log("Badge check error:", err);
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      if (error.response?.status === 401) {
        alert("Your session has expired. Please login again.");
        localStorage.removeItem("token");
        navigate("/login");
      } else {
        alert("Error submitting answer. Please try again.");
      }
    }
  };

  const nextQuiz = () => {
    const currentIndex = quizData.findIndex((q) => q.id === currentQuiz.id);
    const nextIndex = (currentIndex + 1) % quizData.length;
    startQuiz(quizData[nextIndex]);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "easy":
        return "text-green-400";
      case "medium":
        return "text-yellow-400";
      case "hard":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getTimePeriodColor = (period) => {
    switch (period) {
      case "1990s":
        return "bg-blue-500";
      case "2000s":
        return "bg-purple-500";
      case "2010s":
        return "bg-green-500";
      case "2020s":
        return "bg-pink-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="quiz-container">
        <div className="quiz-background">
          <div className="floating-shapes">
            <div className="quiz-shape quiz-shape-1"></div>
            <div className="quiz-shape quiz-shape-2"></div>
            <div className="quiz-shape quiz-shape-3"></div>
          </div>
        </div>
        <div className="quiz-content">
          <div className="quiz-header">
            <h1 className="quiz-title">🧠 Loading Quiz...</h1>
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      {/* Animated Background */}
      <div className="quiz-background">
        <div className="floating-shapes">
          <div className="quiz-shape quiz-shape-1"></div>
          <div className="quiz-shape quiz-shape-2"></div>
          <div className="quiz-shape quiz-shape-3"></div>
        </div>
      </div>

      <div className="quiz-content">
        <div className="quiz-header">
          <h1 className="quiz-title">🧠 SoC Knowledge Challenge</h1>
          <p className="quiz-subtitle">
            Test your knowledge of School of Computing milestones!
          </p>

          <div className="quiz-stats">
            <div className="stat-item">
              <span className="stat-label">Score:</span>
              <span className="stat-value">
                {userStats?.total_correct || 0}/
                {userStats?.total_attempted || 0}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Accuracy:</span>
              <span className="stat-value">
                {userStats?.accuracy_percentage || 0}%
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Completed:</span>
              <span className="stat-value">
                {completedQuizzes.length}/{quizData.length}
              </span>
            </div>
          </div>
        </div>

        {!currentQuiz ? (
          <div className="quiz-selection">
            <h2 className="selection-title">Choose a Milestone to Explore</h2>
            <div className="quiz-grid">
              {quizData.map((quiz) => (
                <div key={quiz.id} className="quiz-card">
                  <div className="quiz-card-header">
                    <div
                      className={`time-period-badge ${getTimePeriodColor(
                        quiz.timePeriod
                      )}`}
                    >
                      {quiz.timePeriod}
                    </div>
                    <div
                      className={`difficulty-badge ${getDifficultyColor(
                        quiz.difficulty
                      )}`}
                    >
                      {quiz.difficulty}
                    </div>
                  </div>

                  {/* Show milestone image in quiz selection */}
                  {quiz.milestone_media_url && (
                    <div className="quiz-card-image">
                      <img
                        src={quiz.milestone_media_url}
                        alt={quiz.milestone}
                        className="quiz-selection-image"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </div>
                  )}

                  <h3 className="quiz-milestone">{quiz.milestone}</h3>

                  <div className="quiz-card-footer">
                    {completedQuizzes.includes(quiz.id) && (
                      <div className="completed-badge">
                        <span className="check-icon">✅</span>
                        <span>Completed</span>
                      </div>
                    )}

                    <button
                      onClick={() => startQuiz(quiz)}
                      className="start-quiz-btn"
                    >
                      {completedQuizzes.includes(quiz.id)
                        ? "Retake"
                        : "Start Quiz"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="quiz-active">
            <div className="quiz-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${
                      (completedQuizzes.length / quizData.length) * 100
                    }%`,
                  }}
                ></div>
              </div>
              <span className="progress-text">
                Progress: {completedQuizzes.length}/{quizData.length} milestones
              </span>
            </div>

            <div className="quiz-question-card">
              <div className="question-header">
                <div
                  className={`time-badge ${getTimePeriodColor(
                    currentQuiz.timePeriod
                  )}`}
                >
                  {currentQuiz.timePeriod}
                </div>
                <div className="milestone-title">{currentQuiz.milestone}</div>
              </div>

              <div className="question-content">
                <h2 className="question-text">
                  {sanitizeContent(currentQuiz.question)}
                </h2>

                {/* Display milestone image if exists */}
                {currentQuiz.milestone_media_url && (
                  <div className="quiz-image-container">
                    <img
                      src={currentQuiz.milestone_media_url}
                      alt={`${currentQuiz.milestone} milestone`}
                      className="quiz-image"
                    />
                  </div>
                )}

                {!showResult ? (
                  <div className="answer-options">
                    {currentQuiz.options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedAnswer(option)}
                        className={`option-btn ${
                          selectedAnswer === option ? "selected" : ""
                        }`}
                      >
                        <span className="option-letter">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="option-text">
                          {sanitizeContent(option)}
                        </span>
                      </button>
                    ))}

                    <button
                      onClick={submitAnswer}
                      disabled={!selectedAnswer}
                      className="submit-btn"
                    >
                      Submit Answer
                    </button>
                  </div>
                ) : (
                  <div className="quiz-result">
                    <div
                      className={`result-header ${
                        isCorrect ? "correct" : "incorrect"
                      }`}
                    >
                      <div className="result-icon">
                        {isCorrect ? "🎉" : "❌"}
                      </div>
                      <div className="result-text">
                        {isCorrect ? "Correct!" : "Incorrect"}
                      </div>
                    </div>

                    <div className="result-details">
                      <p className="correct-answer">
                        <strong>Correct Answer:</strong>{" "}
                        {currentQuiz.correctAnswer}
                      </p>
                      <p className="explanation">{currentQuiz.explanation}</p>
                      {isCorrect && (
                        <p className="milestone-unlocked">
                          🎯 <strong>Milestone Unlocked!</strong> You've learned
                          about this important moment in SoC history.
                        </p>
                      )}
                    </div>

                    <div className="result-actions">
                      <button
                        onClick={() => setCurrentQuiz(null)}
                        className="back-btn"
                      >
                        Back to Selection
                      </button>
                      <button onClick={nextQuiz} className="next-btn">
                        Next Quiz
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;
