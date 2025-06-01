import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DOMPurify from "dompurify";
import "./AdminPanel.css"; // Import your CSS styles
import "../index.css";

const sanitizeContent = (content) => {
  if (!content) return "";
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
};

const validateInput = (value) => {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ];

  if (dangerousPatterns.some((pattern) => pattern.test(value))) {
    return "Input contains potentially dangerous content";
  }
  return null;
};

function AdminPanel() {
  const navigate = useNavigate();
  const [milestones, setMilestones] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("milestones");
  const [sessionValid, setSessionValid] = useState(false);

  // Forms state
  const [milestoneForm, setMilestoneForm] = useState({
    title: "",
    year: "",
    description: "",
    marker_id: "",
    media_url: "",
  });

  const [quizForm, setQuizForm] = useState({
    milestone_id: "",
    question: "",
    correct_answer: "",
    wrong_answer_1: "",
    wrong_answer_2: "",
    wrong_answer_3: "",
  });

  const [editingId, setEditingId] = useState(null);

  const token = localStorage.getItem("token");

  // 🔐 SECURITY: Comprehensive authentication and authorization check
  useEffect(() => {
    const validateAdminAccess = async () => {
      // 1. Check if token exists
      if (!token) {
        alert("Authentication required. Redirecting to login...");
        navigate("/login");
        return;
      }

      try {
        // 2. Decode and validate token structure
        const tokenParts = token.split(".");
        if (tokenParts.length !== 3) {
          throw new Error("Invalid token format");
        }

        const decoded = JSON.parse(atob(tokenParts[1]));

        // 3. Check token expiry
        const currentTime = Date.now() / 1000;
        if (decoded.exp && decoded.exp < currentTime) {
          localStorage.removeItem("token");
          alert("Session expired. Please login again.");
          navigate("/login");
          return;
        }

        // 4. Check role in token (first layer)
        if (decoded.role !== "admin") {
          alert("Access denied. Administrator privileges required.");
          navigate("/");
          return;
        }

        // 5. Verify with backend (second layer) - This makes an API call to verify admin status
        try {
          const verificationResponse = await axios.get(
            "http://localhost:5000/admin/verify",
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          setAdminUser(verificationResponse.data.admin);
          setSessionValid(true);
        } catch (verifyError) {
          console.error("Admin verification failed:", verifyError);

          if (verifyError.response?.status === 403) {
            alert("Access denied. Invalid administrator credentials.");
          } else if (verifyError.response?.status === 401) {
            alert("Session invalid. Please login again.");
            localStorage.removeItem("token");
          } else {
            alert("Unable to verify admin access. Please try again.");
          }

          navigate("/login");
          return;
        }

        // 6. Load admin data only after successful verification
        await loadAdminData();
      } catch (err) {
        console.error("Token validation error:", err);
        localStorage.removeItem("token");
        alert("Invalid session. Please login again.");
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    validateAdminAccess();
  }, [navigate, token]);

  // Load admin data with error handling
  const loadAdminData = async () => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000, // 10 second timeout
      };

      // Load milestones and quizzes in parallel
      const [milestonesResponse, quizzesResponse] = await Promise.all([
        axios.get("http://localhost:5000/milestones", config),
        axios.get("http://localhost:5000/quizzes", config),
      ]);

      setMilestones(milestonesResponse.data);
      setQuizzes(quizzesResponse.data);
    } catch (error) {
      console.error("Error loading admin data:", error);

      if (error.response?.status === 401 || error.response?.status === 403) {
        alert("Session expired or access denied. Please login again.");
        localStorage.removeItem("token");
        navigate("/login");
      } else {
        alert("Error loading data. Please refresh the page.");
      }
    }
  };

  // Secure API request wrapper
  const secureApiRequest = async (requestFunction) => {
    if (!sessionValid) {
      alert("Session invalid. Please refresh the page.");
      return;
    }

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      };

      return await requestFunction(config);
    } catch (error) {
      console.error("API request error:", error);

      if (error.response?.status === 401 || error.response?.status === 403) {
        alert("Session expired or access denied. Please login again.");
        localStorage.removeItem("token");
        navigate("/login");
      } else if (error.response?.data?.error) {
        alert(`Error: ${error.response.data.error}`);
      } else {
        alert("An error occurred. Please try again.");
      }
      throw error;
    }
  };

  // Milestone CRUD operations with security
  const handleMilestoneSubmit = async (e) => {
    e.preventDefault();

    const titleError = validateInput(milestoneForm.title);
    const descError = validateInput(milestoneForm.description);

    if (titleError) {
      alert(titleError);
      return;
    }

    if (descError) {
      alert(descError);
      return;
    }

    try {
      await secureApiRequest(async (config) => {
        if (editingId) {
          await axios.put(
            `http://localhost:5000/milestones/${editingId}`,
            milestoneForm,
            config
          );
        } else {
          await axios.post(
            "http://localhost:5000/milestones",
            milestoneForm,
            config
          );
        }
      });

      // Reset form and reload data
      setMilestoneForm({
        title: "",
        year: "",
        description: "",
        marker_id: "",
        media_url: "",
      });
      setEditingId(null);
      await loadAdminData();
    } catch (error) {
      // Error handled in secureApiRequest
    }
  };

  const handleMilestoneEdit = (milestone) => {
    setMilestoneForm(milestone);
    setEditingId(milestone.id);
  };

  const handleMilestoneDelete = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this milestone? This will also delete all associated quizzes."
      )
    ) {
      return;
    }

    try {
      await secureApiRequest(async (config) => {
        await axios.delete(`http://localhost:5000/milestones/${id}`, config);
      });

      await loadAdminData();
    } catch (error) {
      // Error handled in secureApiRequest
    }
  };

  // Quiz CRUD operations with security
  const handleQuizSubmit = async (e) => {
    e.preventDefault();

    const questionError = validateInput(quizForm.question);
    const answerErrors = [
      validateInput(quizForm.correct_answer),
      validateInput(quizForm.wrong_answer_1),
      validateInput(quizForm.wrong_answer_2),
      validateInput(quizForm.wrong_answer_3),
    ].filter((error) => error !== null);

    if (questionError) {
      alert(questionError);
      return;
    }

    if (answerErrors.length > 0) {
      alert(answerErrors[0]);
      return;
    }

    try {
      await secureApiRequest(async (config) => {
        await axios.post("http://localhost:5000/quizzes", quizForm, config);
      });

      // Reset form and reload data
      setQuizForm({
        milestone_id: "",
        question: "",
        correct_answer: "",
        wrong_answer_1: "",
        wrong_answer_2: "",
        wrong_answer_3: "",
      });
      await loadAdminData();
    } catch (error) {
      // Error handled in secureApiRequest
    }
  };

  // Show loading screen while validating admin access
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <h2 className="text-white text-xl">
            Verifying Administrator Access...
          </h2>
          <p className="text-gray-300 mt-2">
            Please wait while we validate your credentials
          </p>
        </div>
      </div>
    );
  }

  // Don't render admin panel if session is not valid
  if (!sessionValid || !adminUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">🚫</div>
          <h2 className="text-white text-2xl mb-4">Access Denied</h2>
          <p className="text-gray-300 mb-6">
            You don't have permission to access this area.
          </p>
          <button
            onClick={() => navigate("/")}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 pt-20 pb-10">
      <div className="container mx-auto px-4">
        {/* Admin Header with Security Info */}
        <div className="mb-8 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                🛡️ Secure Admin Panel
              </h1>
              <p className="text-gray-300">
                Welcome back,{" "}
                <span className="text-cyan-400 font-semibold">
                  {adminUser.name}
                </span>
              </p>
              <div className="text-sm text-gray-400 mt-1">
                Session verified • Role: Administrator • Access Level: Full
              </div>
            </div>
            <div className="text-right">
              <div className="text-green-400 font-semibold flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                Secure Connection
              </div>
              <div className="text-sm text-gray-400">
                ID: {adminUser.id} • Verified: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab("milestones")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === "milestones"
                  ? "bg-cyan-600 text-white"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              🗓️ Manage Milestones
            </button>
            <button
              onClick={() => setActiveTab("quizzes")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === "quizzes"
                  ? "bg-cyan-600 text-white"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              🧠 Manage Quizzes
            </button>
          </div>
        </div>

        {/* Milestones Tab */}
        {activeTab === "milestones" && (
          <div className="space-y-8">
            {/* Milestone Form */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingId ? "Edit Milestone" : "Add New Milestone"}
              </h2>

              <form
                onSubmit={handleMilestoneSubmit}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <input
                  className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="Milestone Title"
                  value={milestoneForm.title}
                  onChange={(e) =>
                    setMilestoneForm({
                      ...milestoneForm,
                      title: e.target.value,
                    })
                  }
                  required
                />
                <input
                  type="number"
                  className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="Year"
                  value={milestoneForm.year}
                  onChange={(e) =>
                    setMilestoneForm({ ...milestoneForm, year: e.target.value })
                  }
                  required
                />
                <input
                  className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="AR Marker ID"
                  value={milestoneForm.marker_id}
                  onChange={(e) =>
                    setMilestoneForm({
                      ...milestoneForm,
                      marker_id: e.target.value,
                    })
                  }
                  required
                />
                <input
                  className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="Media URL (optional)"
                  value={milestoneForm.media_url}
                  onChange={(e) =>
                    setMilestoneForm({
                      ...milestoneForm,
                      media_url: e.target.value,
                    })
                  }
                />
                <textarea
                  className="md:col-span-2 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="Description"
                  rows="3"
                  value={milestoneForm.description}
                  onChange={(e) =>
                    setMilestoneForm({
                      ...milestoneForm,
                      description: e.target.value,
                    })
                  }
                  required
                />
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-cyan-600 hover:to-purple-700 transition-all"
                  >
                    {editingId ? "Update Milestone" : "Add Milestone"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setMilestoneForm({
                          title: "",
                          year: "",
                          description: "",
                          marker_id: "",
                          media_url: "",
                        });
                      }}
                      className="ml-4 bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-700 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Milestones List */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
              <div className="p-6 border-b border-white/20">
                <h3 className="text-xl font-bold text-white">
                  Existing Milestones ({milestones.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr className="text-left">
                      <th className="px-6 py-4 text-gray-300 font-semibold">
                        Title
                      </th>
                      <th className="px-6 py-4 text-gray-300 font-semibold">
                        Year
                      </th>
                      <th className="px-6 py-4 text-gray-300 font-semibold">
                        Marker ID
                      </th>
                      <th className="px-6 py-4 text-gray-300 font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.map((milestone) => (
                      <tr
                        key={milestone.id}
                        className="border-b border-white/10 hover:bg-white/5"
                      >
                        <td className="px-6 py-4 text-white">
                          {sanitizeContent(milestone.title)}
                        </td>
                        <td className="px-6 py-4 text-gray-300">
                          {milestone.year}
                        </td>
                        <td className="px-6 py-4 text-gray-300 font-mono text-sm">
                          {milestone.marker_id}
                        </td>
                        <td className="px-6 py-4">
                          {milestone.media_url ? (
                            <img
                              src={milestone.media_url}
                              alt={milestone.title}
                              className="w-16 h-16 object-cover rounded-lg border border-white/20"
                              onError={(e) => {
                                e.target.src =
                                  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>';
                              }}
                            />
                          ) : (
                            <span className="text-gray-500 text-sm">
                              No media
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleMilestoneEdit(milestone)}
                            className="bg-yellow-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors mr-2"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleMilestoneDelete(milestone.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Quizzes Tab */}
        {activeTab === "quizzes" && (
          <div className="space-y-8">
            {/* Quiz Form */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">
                Add New Quiz Question
              </h2>

              <form onSubmit={handleQuizSubmit} className="space-y-4">
                <select
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  value={quizForm.milestone_id}
                  onChange={(e) =>
                    setQuizForm({ ...quizForm, milestone_id: e.target.value })
                  }
                  required
                >
                  <option value="" className="bg-gray-800">
                    Select Milestone
                  </option>
                  {milestones.map((milestone) => (
                    <option
                      key={milestone.id}
                      value={milestone.id}
                      className="bg-gray-800"
                    >
                      {milestone.title} ({milestone.year})
                    </option>
                  ))}
                </select>

                <textarea
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="Quiz Question"
                  rows="3"
                  value={quizForm.question}
                  onChange={(e) =>
                    setQuizForm({ ...quizForm, question: e.target.value })
                  }
                  required
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                    placeholder="Correct Answer"
                    value={quizForm.correct_answer}
                    onChange={(e) =>
                      setQuizForm({
                        ...quizForm,
                        correct_answer: e.target.value,
                      })
                    }
                    required
                  />
                  <input
                    className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400"
                    placeholder="Wrong Answer 1"
                    value={quizForm.wrong_answer_1}
                    onChange={(e) =>
                      setQuizForm({
                        ...quizForm,
                        wrong_answer_1: e.target.value,
                      })
                    }
                    required
                  />
                  <input
                    className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400"
                    placeholder="Wrong Answer 2"
                    value={quizForm.wrong_answer_2}
                    onChange={(e) =>
                      setQuizForm({
                        ...quizForm,
                        wrong_answer_2: e.target.value,
                      })
                    }
                    required
                  />
                  <input
                    className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400"
                    placeholder="Wrong Answer 3"
                    value={quizForm.wrong_answer_3}
                    onChange={(e) =>
                      setQuizForm({
                        ...quizForm,
                        wrong_answer_3: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-blue-700 transition-all"
                >
                  Add Quiz Question
                </button>
              </form>
            </div>

            {/* Quizzes List */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
              <div className="p-6 border-b border-white/20">
                <h3 className="text-xl font-bold text-white">
                  Existing Quiz Questions ({quizzes.length})
                </h3>
              </div>
              <div className="space-y-4 p-6">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="bg-white/5 rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-cyan-400 font-semibold text-sm">
                        {quiz.milestone_title} ({quiz.milestone_year})
                      </span>
                      <span className="text-gray-400 text-sm">
                        ID: {quiz.id}
                      </span>
                    </div>
                    <h4 className="text-white font-medium mb-3">
                      {quiz.question}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div className="text-green-400">
                        ✓ {quiz.correct_answer}
                      </div>
                      <div className="text-red-400">
                        ✗ {quiz.wrong_answer_1}
                      </div>
                      <div className="text-red-400">
                        ✗ {quiz.wrong_answer_2}
                      </div>
                      <div className="text-red-400">
                        ✗ {quiz.wrong_answer_3}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
