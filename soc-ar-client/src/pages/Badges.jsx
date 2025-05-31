import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Features.css";

const Badges = () => {
  const navigate = useNavigate();
  const [userBadges, setUserBadges] = useState([]);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [badgeStats, setBadgeStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  // Check authentication on component mount
  useEffect(() => {
    if (!token) {
      alert("Please login to access your badge collection");
      navigate("/login");
      return;
    }

    fetchBadges();
    fetchBadgeStats();
  }, [token, navigate]);

  // Fetch user badges from backend
  const fetchBadges = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await axios.get("http://localhost:5000/badges", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUserBadges(response.data);
    } catch (error) {
      console.error("Error fetching badges:", error);
      if (error.response?.status === 401) {
        alert("Session expired. Please login again.");
        localStorage.removeItem("token");
        navigate("/login");
      } else {
        alert("Error loading badges. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch badge collection statistics
  const fetchBadgeStats = async () => {
    if (!token) return;

    try {
      const response = await axios.get("http://localhost:5000/badges/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setBadgeStats(response.data);
    } catch (error) {
      console.log("No badge stats available yet");
    }
  };

  // Check for new badges
  const checkForNewBadges = async () => {
    if (!token) return;

    try {
      const response = await axios.post(
        "http://localhost:5000/badges/check",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.newBadges && response.data.newBadges.length > 0) {
        alert(
          `🎉 Congratulations! You've earned ${response.data.newBadges.length} new badge(s)!`
        );
        fetchBadges(); // Refresh badges
        fetchBadgeStats(); // Refresh stats
      }
    } catch (error) {
      console.error("Error checking badges:", error);
    }
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case "common":
        return "text-gray-400 border-gray-400";
      case "rare":
        return "text-blue-400 border-blue-400";
      case "epic":
        return "text-purple-400 border-purple-400";
      case "legendary":
        return "text-yellow-400 border-yellow-400";
      default:
        return "text-gray-400 border-gray-400";
    }
  };

  const getColorClasses = (badge) => {
    const colors = {
      pioneer_90s: {
        bg: "from-blue-400 to-blue-600",
        shadow: "shadow-blue-500/50",
      },
      digital_2000s: {
        bg: "from-purple-400 to-purple-600",
        shadow: "shadow-purple-500/50",
      },
      innovation_2010s: {
        bg: "from-green-400 to-green-600",
        shadow: "shadow-green-500/50",
      },
      future_2020s: {
        bg: "from-pink-400 to-pink-600",
        shadow: "shadow-pink-500/50",
      },
      time_master: {
        bg: "from-yellow-400 to-orange-600",
        shadow: "shadow-yellow-500/50",
      },
      quiz_expert: {
        bg: "from-indigo-400 to-indigo-600",
        shadow: "shadow-indigo-500/50",
      },
    };

    return (
      colors[badge.id] || {
        bg: "from-gray-400 to-gray-600",
        shadow: "shadow-gray-500/50",
      }
    );
  };

  if (loading) {
    return (
      <div className="badges-container">
        <div className="badges-background">
          <div className="floating-badges">
            <div className="floating-badge badge-float-1">🏆</div>
            <div className="floating-badge badge-float-2">⚡</div>
            <div className="floating-badge badge-float-3">🌟</div>
            <div className="floating-badge badge-float-4">💎</div>
          </div>
        </div>
        <div className="badges-content">
          <div className="badges-header">
            <h1 className="badges-title">🏅 Loading Badges...</h1>
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="badges-container">
      {/* Animated Background */}
      <div className="badges-background">
        <div className="floating-badges">
          <div className="floating-badge badge-float-1">🏆</div>
          <div className="floating-badge badge-float-2">⚡</div>
          <div className="floating-badge badge-float-3">🌟</div>
          <div className="floating-badge badge-float-4">💎</div>
        </div>
      </div>

      <div className="badges-content">
        {/* Header */}
        <div className="badges-header">
          <h1 className="badges-title">🏅 Badge Collection</h1>
          <p className="badges-subtitle">
            Unlock achievements by exploring SoC milestones
          </p>

          {/* Collection Stats */}
          <div className="collection-stats">
            <div className="stats-circle">
              <div className="stats-inner">
                <div className="stats-percentage">
                  {badgeStats?.percentage || 0}%
                </div>
                <div className="stats-label">Complete</div>
              </div>
              <svg className="stats-ring" viewBox="0 0 36 36">
                <path
                  className="stats-ring-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="stats-ring-progress"
                  strokeDasharray={`${badgeStats?.percentage || 0}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
            </div>

            <div className="stats-details">
              <div className="stat-item">
                <span className="stat-number">{badgeStats?.earned || 0}</span>
                <span className="stat-label">Earned</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{badgeStats?.total || 0}</span>
                <span className="stat-label">Total</span>
              </div>
            </div>
          </div>

          {/* Check Badges Button */}
          <button
            onClick={checkForNewBadges}
            className="btn-primary"
            style={{ marginBottom: "2rem" }}
          >
            🔍 Check for New Badges
          </button>
        </div>

        {/* Badge Grid */}
        <div className="badges-grid">
          {userBadges.map((badge) => {
            const colorClasses = getColorClasses(badge);

            return (
              <div
                key={badge.id}
                className={`badge-card ${
                  badge.isEarned ? "earned" : "locked"
                } ${badge.rarity}`}
                onClick={() => {
                  setSelectedBadge(badge);
                  setShowBadgeModal(true);
                }}
              >
                <div
                  className={`badge-icon-container bg-gradient-to-br ${colorClasses.bg}`}
                >
                  <div className="badge-icon">
                    {badge.isEarned ? badge.icon : "🔒"}
                  </div>
                  {badge.isEarned && (
                    <div className={`badge-glow ${colorClasses.shadow}`}></div>
                  )}
                </div>

                <div className="badge-info">
                  <h3 className="badge-name">{badge.name}</h3>
                  <p className="badge-description">{badge.description}</p>

                  <div className="badge-meta">
                    <span
                      className={`badge-rarity ${getRarityColor(badge.rarity)}`}
                    >
                      {badge.rarity.toUpperCase()}
                    </span>
                    <span className="badge-period">
                      {badge.requirement_type}
                    </span>
                  </div>

                  {!badge.isEarned && badge.progress && (
                    <div className="badge-progress">
                      <div className="progress-bar-small">
                        <div
                          className="progress-fill-small"
                          style={{
                            width: `${
                              (badge.progress.current / badge.progress.total) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="progress-text-small">
                        {badge.progress.current}/{badge.progress.total}
                      </span>
                    </div>
                  )}

                  {badge.isEarned && (
                    <div className="earned-indicator">
                      <span className="earned-icon">✅</span>
                      <span className="earned-text">Unlocked!</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Badges */}
        {badgeStats?.recentBadges && badgeStats.recentBadges.length > 0 && (
          <div className="recent-badges">
            <h2 className="recent-title">Recently Earned</h2>
            <div className="recent-badges-list">
              {badgeStats.recentBadges.slice(0, 3).map((badge, index) => {
                const colorClasses = getColorClasses(badge);
                return (
                  <div
                    key={`${badge.id}-${index}`}
                    className="recent-badge-item"
                  >
                    <div
                      className={`recent-badge-icon bg-gradient-to-br ${colorClasses.bg}`}
                    >
                      {badge.icon}
                    </div>
                    <div className="recent-badge-info">
                      <span className="recent-badge-name">{badge.name}</span>
                      <span className="recent-badge-time">
                        {new Date(badge.earnedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Badge Detail Modal */}
      {showBadgeModal && selectedBadge && (
        <div
          className="badge-modal-overlay"
          onClick={() => setShowBadgeModal(false)}
        >
          <div className="badge-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button
                className="modal-close"
                onClick={() => setShowBadgeModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-content">
              <div
                className={`modal-badge-icon bg-gradient-to-br ${
                  getColorClasses(selectedBadge).bg
                } ${getColorClasses(selectedBadge).shadow}`}
              >
                {selectedBadge.isEarned ? selectedBadge.icon : "🔒"}
              </div>

              <h2 className="modal-badge-name">{selectedBadge.name}</h2>
              <p className="modal-badge-description">
                {selectedBadge.description}
              </p>

              <div className="modal-badge-details">
                <div className="detail-row">
                  <span className="detail-label">Rarity:</span>
                  <span
                    className={`detail-value ${getRarityColor(
                      selectedBadge.rarity
                    )}`}
                  >
                    {selectedBadge.rarity.toUpperCase()}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Requirement:</span>
                  <span className="detail-value">
                    {selectedBadge.requirement_type}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value">
                    {selectedBadge.isEarned ? "✅ Unlocked" : "🔒 Locked"}
                  </span>
                </div>
                {selectedBadge.isEarned && selectedBadge.earnedAt && (
                  <div className="detail-row">
                    <span className="detail-label">Earned:</span>
                    <span className="detail-value">
                      {new Date(selectedBadge.earnedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Badges;
