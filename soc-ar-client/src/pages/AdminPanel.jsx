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

  const [resources, setResources] = useState([]);
  const [resourceForm, setResourceForm] = useState({
    milestone_id: "",
    resource_type: "article",
    title: "",
    description: "",
    url: "",
    content: "",
    display_order: 0,
    is_active: true,
  });
  const [editingResourceId, setEditingResourceId] = useState(null);

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
        timeout: 10000,
      };

      console.log("🔄 Loading admin data...");

      // Load milestones and quizzes (essential data)
      const [milestonesResponse, quizzesResponse] = await Promise.all([
        axios.get("http://localhost:5000/milestones", config),
        axios.get("http://localhost:5000/quizzes", config),
      ]);

      setMilestones(milestonesResponse.data);
      setQuizzes(quizzesResponse.data);

      console.log("✅ Loaded milestones:", milestonesResponse.data.length);
      console.log("✅ Loaded quizzes:", quizzesResponse.data.length);

      // Try to load resources (optional - may not exist yet)
      try {
        const resourcesResponse = await axios.get(
          "http://localhost:5000/resources/admin/all",
          config
        );
        setResources(resourcesResponse.data);
        console.log("✅ Loaded resources:", resourcesResponse.data.length);
      } catch (resourceError) {
        console.log(
          "⚠️ Resources endpoint not available yet - setting empty array"
        );
        setResources([]); // Set empty array if resources endpoint doesn't exist
      }
    } catch (error) {
      console.error("❌ Error loading admin data:", error);

      if (error.response?.status === 401 || error.response?.status === 403) {
        alert("Session expired or access denied. Please login again.");
        localStorage.removeItem("token");
        navigate("/login");
      } else {
        // More specific error message
        const errorMsg =
          error.response?.data?.error || error.message || "Unknown error";
        console.error("Detailed error:", errorMsg);
        alert(
          `Error loading data: ${errorMsg}. Please check the console for details.`
        );
      }
    }
  };

  const handleResourceSubmit = async (e) => {
    e.preventDefault();

    try {
      await secureApiRequest(async (config) => {
        if (editingResourceId) {
          await axios.put(
            `http://localhost:5000/resources/${editingResourceId}`,
            resourceForm,
            config
          );
        } else {
          await axios.post(
            "http://localhost:5000/resources",
            resourceForm,
            config
          );
        }
      });

      // Reset form and reload data
      setResourceForm({
        milestone_id: "",
        resource_type: "article",
        title: "",
        description: "",
        url: "",
        content: "",
        display_order: 0,
        is_active: true,
      });
      setEditingResourceId(null);
      await loadAdminData();
    } catch (error) {
      // Error handled in secureApiRequest
    }
  };

  const handleResourceEdit = (resource) => {
    setResourceForm({
      milestone_id: resource.milestone_id,
      resource_type: resource.resource_type,
      title: resource.title,
      description: resource.description || "",
      url: resource.url || "",
      content: resource.content || "",
      display_order: resource.display_order,
      is_active: resource.is_active,
    });
    setEditingResourceId(resource.id);
  };

  const handleResourceDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this resource?")) {
      return;
    }

    try {
      await secureApiRequest(async (config) => {
        await axios.delete(`http://localhost:5000/resources/${id}`, config);
      });
      await loadAdminData();
    } catch (error) {
      // Error handled in secureApiRequest
      console.error("Resource delete error:", error);
    }
  };

  const toggleResourceStatus = async (id) => {
    try {
      await secureApiRequest(async (config) => {
        await axios.patch(
          `http://localhost:5000/resources/${id}/toggle`,
          {},
          config
        );
      });
      await loadAdminData();
    } catch (error) {
      // Error handled in secureApiRequest
      console.error("Resource toggle error:", error);
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
            <button
              onClick={() => setActiveTab("resources")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === "resources"
                  ? "bg-cyan-600 text-white"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              📚 Manage Resources
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
                  placeholder="Image URL (for quiz context) - e.g., https://example.com/image.jpg"
                  value={milestoneForm.media_url}
                  onChange={(e) =>
                    setMilestoneForm({
                      ...milestoneForm,
                      media_url: e.target.value,
                    })
                  }
                  type="url"
                />
                {milestoneForm.media_url && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-300 mb-2">
                      📷 Image Preview:
                    </p>
                    <img
                      src={milestoneForm.media_url}
                      alt="Milestone preview"
                      style={{
                        maxWidth: "300px",
                        maxHeight: "200px",
                        objectFit: "cover",
                        borderRadius: "12px",
                        border: "2px solid rgba(255, 255, 255, 0.2)",
                      }}
                    />
                    <p className="text-xs text-gray-400 mt-2">
                      🎯 This image will appear in quizzes related to this
                      milestone.
                    </p>
                  </div>
                )}
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
                        <td className="px-6 py-4">
                          {milestone.media_url ? (
                            <div className="flex items-center gap-2">
                              <img
                                src={milestone.media_url}
                                alt={milestone.title}
                                className="milestone-thumbnail"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  e.target.nextSibling.style.display = "inline";
                                }}
                              />
                              <span className="hidden text-red-400 text-xs">
                                ❌
                              </span>
                              <span className="text-green-400 text-xs">📷</span>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-xs">
                              No image
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-300 font-mono text-sm">
                          {milestone.marker_id}
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

                    {/* FIXED: Smaller milestone image */}
                    {quiz.milestone_media_url && (
                      <div className="admin-quiz-image-container">
                        <img
                          src={quiz.milestone_media_url}
                          alt={`${quiz.milestone_title} milestone`}
                          className="quiz-list-image"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                        <p className="text-xs text-gray-400 mt-1 ml-2">
                          📷 Milestone Media
                        </p>
                      </div>
                    )}

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

        {activeTab === "resources" && (
          <div className="space-y-8">
            {/* Resource Form */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingResourceId
                  ? "Edit Resource"
                  : "Add New Learning Resource"}
              </h2>

              <form onSubmit={handleResourceSubmit} className="space-y-4">
                {/* Milestone Selection */}
                <select
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  value={resourceForm.milestone_id}
                  onChange={(e) =>
                    setResourceForm({
                      ...resourceForm,
                      milestone_id: e.target.value,
                    })
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Resource Type */}
                  <select
                    className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    value={resourceForm.resource_type}
                    onChange={(e) =>
                      setResourceForm({
                        ...resourceForm,
                        resource_type: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="article" className="bg-gray-800">
                      📖 Article
                    </option>
                    <option value="video" className="bg-gray-800">
                      🎥 Video
                    </option>
                    <option value="document" className="bg-gray-800">
                      📄 Document
                    </option>
                    <option value="link" className="bg-gray-800">
                      🔗 External Link
                    </option>
                    <option value="text" className="bg-gray-800">
                      📝 Text Content
                    </option>
                  </select>

                  {/* Display Order */}
                  <input
                    type="number"
                    className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    placeholder="Display Order (0-100)"
                    value={resourceForm.display_order}
                    onChange={(e) =>
                      setResourceForm({
                        ...resourceForm,
                        display_order: parseInt(e.target.value) || 0,
                      })
                    }
                    min="0"
                    max="100"
                  />
                </div>

                {/* Title */}
                <input
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="Resource Title"
                  value={resourceForm.title}
                  onChange={(e) =>
                    setResourceForm({ ...resourceForm, title: e.target.value })
                  }
                  required
                />

                {/* Description */}
                <textarea
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  placeholder="Resource Description"
                  rows="3"
                  value={resourceForm.description}
                  onChange={(e) =>
                    setResourceForm({
                      ...resourceForm,
                      description: e.target.value,
                    })
                  }
                />

                {/* URL (conditional) */}
                {resourceForm.resource_type !== "text" && (
                  <input
                    type="url"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    placeholder="Resource URL (https://...)"
                    value={resourceForm.url}
                    onChange={(e) =>
                      setResourceForm({ ...resourceForm, url: e.target.value })
                    }
                  />
                )}

                {/* Text Content (conditional) */}
                {resourceForm.resource_type === "text" && (
                  <textarea
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    placeholder="Text Content"
                    rows="6"
                    value={resourceForm.content}
                    onChange={(e) =>
                      setResourceForm({
                        ...resourceForm,
                        content: e.target.value,
                      })
                    }
                  />
                )}

                {/* Active Status */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="resource-active"
                    checked={resourceForm.is_active}
                    onChange={(e) =>
                      setResourceForm({
                        ...resourceForm,
                        is_active: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <label htmlFor="resource-active" className="text-white">
                    Active (visible to students)
                  </label>
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-blue-700 transition-all"
                  >
                    {editingResourceId ? "Update Resource" : "Add Resource"}
                  </button>

                  {editingResourceId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingResourceId(null);
                        setResourceForm({
                          milestone_id: "",
                          resource_type: "article",
                          title: "",
                          description: "",
                          url: "",
                          content: "",
                          display_order: 0,
                          is_active: true,
                        });
                      }}
                      className="bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-700 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Resources List */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden">
              <div className="p-6 border-b border-white/20">
                <h3 className="text-xl font-bold text-white">
                  Learning Resources ({resources.length})
                </h3>
              </div>

              <div className="space-y-4 p-6">
                {resources.map((resource) => (
                  <div
                    key={resource.id}
                    className={`bg-white/5 rounded-xl p-4 border border-white/10 ${
                      !resource.is_active ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {resource.resource_type === "article" && "📖"}
                          {resource.resource_type === "video" && "🎥"}
                          {resource.resource_type === "document" && "📄"}
                          {resource.resource_type === "link" && "🔗"}
                          {resource.resource_type === "text" && "📝"}
                        </span>
                        <span className="text-cyan-400 font-semibold text-sm">
                          {resource.milestone_title} ({resource.milestone_year})
                        </span>
                        {!resource.is_active && (
                          <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs">
                            Inactive
                          </span>
                        )}
                      </div>
                      <span className="text-gray-400 text-sm">
                        Order: {resource.display_order}
                      </span>
                    </div>

                    <h4 className="text-white font-medium mb-2">
                      {resource.title}
                    </h4>

                    {resource.description && (
                      <p className="text-gray-300 text-sm mb-2">
                        {resource.description}
                      </p>
                    )}

                    {resource.url && (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 text-sm hover:underline block mb-2"
                      >
                        🔗 {resource.url}
                      </a>
                    )}

                    {resource.content && (
                      <div className="bg-white/5 rounded p-3 mb-2">
                        <p className="text-gray-300 text-sm">
                          {resource.content.substring(0, 200)}
                          {resource.content.length > 200 && "..."}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleResourceEdit(resource)}
                        className="bg-yellow-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleResourceStatus(resource.id)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          resource.is_active
                            ? "bg-orange-600 hover:bg-orange-700 text-white"
                            : "bg-green-600 hover:bg-green-700 text-white"
                        }`}
                      >
                        {resource.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleResourceDelete(resource.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}

                {resources.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    <p>No learning resources created yet.</p>
                    <p className="text-sm">
                      Add your first resource using the form above.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
