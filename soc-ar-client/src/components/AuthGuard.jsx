import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthGuard = ({ children }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      // Redirect to login if no token
      navigate("/login");
      return;
    }

    try {
      // Verify token format
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Date.now() / 1000;

      // Check if token is expired
      if (payload.exp && payload.exp < currentTime) {
        localStorage.removeItem("token");
        alert("Your session has expired. Please login again.");
        navigate("/login");
        return;
      }
    } catch (error) {
      // Invalid token format
      localStorage.removeItem("token");
      alert("Invalid session. Please login again.");
      navigate("/login");
      return;
    }
  }, [token, navigate]);

  // Don't render children if no valid token
  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-background">
          <div className="floating-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
          </div>
        </div>
        <div className="auth-content">
          <div className="auth-card">
            <div className="auth-header">
              <div className="auth-icon">
                <div className="lock-icon">🔐</div>
              </div>
              <h2 className="auth-title">Authentication Required</h2>
              <p className="auth-subtitle">
                Please login to access this feature
              </p>
            </div>
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
              <button
                onClick={() => navigate("/login")}
                className="auth-button primary"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default AuthGuard;
