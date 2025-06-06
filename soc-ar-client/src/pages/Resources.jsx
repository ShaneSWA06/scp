import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DOMPurify from "dompurify";
import "./Features.css";

const sanitizeContent = (content) => {
  if (!content) return "";
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
};

const ResourcesPage = () => {
  const navigate = useNavigate();
  const [milestones, setMilestones] = useState([]);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      alert("Please login to access resources");
      navigate("/login");
      return;
    }

    fetchMilestones();
  }, [token, navigate]);

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:5000/milestones", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Fetched milestones:", response.data); // Debug log
      setMilestones(response.data);
    } catch (error) {
      console.error("Error fetching milestones:", error);
      if (error.response?.status === 401) {
        alert("Session expired. Please login again.");
        localStorage.removeItem("token");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchResourcesForMilestone = async (milestoneId) => {
    try {
      setResourcesLoading(true);
      const response = await axios.get(
        `http://localhost:5000/resources/milestone/${milestoneId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setResources(response.data);
    } catch (error) {
      console.error("Error fetching resources:", error);
      setResources([]);
    } finally {
      setResourcesLoading(false);
    }
  };

  const selectMilestone = (milestone) => {
    setSelectedMilestone(milestone);
    fetchResourcesForMilestone(milestone.id);
  };

  const getResourceIcon = (type) => {
    switch (type) {
      case "article":
        return "📖";
      case "video":
        return "🎥";
      case "document":
        return "📄";
      case "link":
        return "🔗";
      case "text":
        return "📝";
      default:
        return "📚";
    }
  };

  const getTimePeriod = (year) => {
    if (year >= 1990 && year <= 1999) return "1990s";
    if (year >= 2000 && year <= 2009) return "2000s";
    if (year >= 2010 && year <= 2019) return "2010s";
    if (year >= 2020 && year <= 2029) return "2020s";
    return "Other";
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
      <div className="resources-container">
        <div className="resources-background">
          <div className="floating-shapes">
            <div className="resource-shape resource-shape-1">📖</div>
            <div className="resource-shape resource-shape-2">💡</div>
            <div className="resource-shape resource-shape-3">🎯</div>
            <div className="resource-shape resource-shape-4">📚</div>
          </div>
        </div>
        <div className="resources-content">
          <div className="resources-header">
            <h1 className="resources-title">📚 Loading Resources...</h1>
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="resources-container">
      {/* Animated Background */}
      <div className="resources-background">
        <div className="floating-shapes">
          <div className="resource-shape resource-shape-1">📖</div>
          <div className="resource-shape resource-shape-2">💡</div>
          <div className="resource-shape resource-shape-3">🎯</div>
          <div className="resource-shape resource-shape-4">📚</div>
        </div>
      </div>

      <div className="resources-content">
        {/* Header */}
        <div className="resources-header">
          <h1 className="resources-title">📚 Learning Resources</h1>
          <p className="resources-subtitle">
            Explore comprehensive learning materials for SoC milestones
          </p>
        </div>

        {!selectedMilestone ? (
          // Milestone Selection View
          <div className="milestone-selection">
            <h2 className="section-title">Choose a Milestone to Study</h2>
            <div className="resources-grid">
              {milestones.map((milestone) => {
                const timePeriod = getTimePeriod(milestone.year);
                return (
                  <div
                    key={milestone.id}
                    className="resource-card milestone-card"
                  >
                    <div className="milestone-header">
                      <div
                        className={`time-period-badge ${getTimePeriodColor(
                          timePeriod
                        )}`}
                      >
                        {timePeriod}
                      </div>
                      <div className="milestone-year">{milestone.year}</div>
                    </div>

                    {milestone.media_url && (
                      <div className="milestone-image-preview">
                        <img
                          src={milestone.media_url}
                          alt={milestone.title}
                          className="milestone-thumbnail"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      </div>
                    )}

                    <h3 className="milestone-title">
                      {milestone.title || "Untitled Milestone"}
                    </h3>
                    <p className="milestone-description">
                      {milestone.description
                        ? milestone.description.length > 120
                          ? milestone.description.substring(0, 120) + "..."
                          : milestone.description
                        : "No description available"}
                    </p>

                    <div className="milestone-footer">
                      <button
                        className="explore-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          selectMilestone(milestone);
                        }}
                      >
                        📖 Explore Resources
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {milestones.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📚</div>
                <h3>No Milestones Available</h3>
                <p>Resources will appear here once milestones are created.</p>
              </div>
            )}
          </div>
        ) : (
          // Selected Milestone Resources View
          <div className="milestone-resources">
            {/* Back Button */}
            <div className="navigation-header">
              <button
                onClick={() => {
                  setSelectedMilestone(null);
                  setResources([]);
                }}
                className="back-btn"
              >
                ← Back to Milestones
              </button>
            </div>

            {/* Milestone Context */}
            <div className="milestone-context">
              <div className="context-card">
                <div className="context-header">
                  <div
                    className={`time-period-badge ${getTimePeriodColor(
                      getTimePeriod(selectedMilestone.year)
                    )}`}
                  >
                    {getTimePeriod(selectedMilestone.year)}
                  </div>
                  <h2 className="milestone-title">{selectedMilestone.title}</h2>
                  <div className="milestone-year">{selectedMilestone.year}</div>
                </div>

                {selectedMilestone.media_url && (
                  <div className="milestone-image-section">
                    <img
                      src={selectedMilestone.media_url}
                      alt={selectedMilestone.title}
                      className="milestone-resource-image"
                    />
                  </div>
                )}

                <p className="milestone-description">
                  {selectedMilestone.description}
                </p>
              </div>
            </div>

            {/* Learning Resources */}
            {resourcesLoading ? (
              <div className="loading-section">
                <div className="loading-spinner"></div>
                <p>Loading resources...</p>
              </div>
            ) : (
              <div className="learning-resources">
                <h2 className="section-title">📖 Study Materials</h2>

                {resources.length > 0 ? (
                  <div className="resources-grid">
                    {resources.map((resource) => (
                      <div key={resource.id} className="resource-card">
                        <div className="resource-icon">
                          {getResourceIcon(resource.resource_type)}
                        </div>
                        <h3>{resource.title}</h3>
                        {resource.description && <p>{resource.description}</p>}

                        {resource.content && (
                          <div className="resource-content">
                            <div className="content-preview">
                              {resource.content.substring(0, 200)}
                              {resource.content.length > 200 && "..."}
                            </div>
                          </div>
                        )}

                        {resource.url && (
                          <div className="resource-link-section">
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="resource-link"
                            >
                              🔗 Open Resource
                            </a>
                          </div>
                        )}

                        <div className="resource-meta">
                          <span className="resource-type">
                            {resource.resource_type.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-resources">
                    <div className="empty-state">
                      <div className="empty-icon">📚</div>
                      <h3>No Resources Available</h3>
                      <p>
                        Resources for this milestone haven't been created yet.
                        Check back later!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="resource-actions">
              <button
                onClick={() => navigate("/quiz")}
                className="btn-primary quiz-btn"
              >
                🧠 Take Quiz on This Topic
              </button>
              <button
                onClick={() => navigate("/badges")}
                className="btn-secondary badges-btn"
              >
                🏆 View My Badges
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourcesPage;
