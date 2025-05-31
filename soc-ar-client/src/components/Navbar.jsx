import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const token = localStorage.getItem("token");

  let role = null;
  let userName = null;

  // Debug: Log token info
  console.log("Token:", token);

  if (token) {
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      role = decoded.role;
      userName = decoded.full_name || decoded.email;
      console.log("Decoded user:", { role, userName });
    } catch (err) {
      console.error("Invalid token:", err);
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
    alert("Logged out!");
  };

  const isAdminPage = location.pathname.startsWith("/admin");
  console.log("Is admin page:", isAdminPage);
  console.log("Current path:", location.pathname);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <div className="logo-icon">
            <div className="lightning">⚡</div>
          </div>
          <span className="logo-text">SoC AR</span>
        </Link>

        {/* Desktop Menu */}
        <div className="navbar-menu">
          {/* Debug info */}
          <div
            style={{ color: "white", fontSize: "12px", marginRight: "1rem" }}
          >
            Role: {role || "none"} | Admin Page: {isAdminPage ? "yes" : "no"}
          </div>

          {/* Simple Navigation Logic */}
          {role === "admin" && isAdminPage ? (
            // Admin on admin pages
            <>
              <Link
                to="/admin"
                className="nav-link"
                style={{ color: "#fbbf24" }}
              >
                🛡️ Admin Dashboard
              </Link>
              <Link to="/" className="nav-link" style={{ color: "#94a3b8" }}>
                🏠 Back to Site
              </Link>
            </>
          ) : (
            // Everyone else or admin on regular pages
            <>
              <Link to="/" className="nav-link">
                Home
              </Link>

              {token ? (
                <>
                  <Link to="/quiz" className="nav-link">
                    Explore Quiz
                  </Link>
                  <Link to="/badges" className="nav-link">
                    Badge Collection
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" className="nav-link">
                    Explore Quiz 🔒
                  </Link>
                  <Link to="/login" className="nav-link">
                    Badge Collection 🔒
                  </Link>
                </>
              )}
            </>
          )}

          {/* Auth Section */}
          {!token ? (
            <div className="auth-buttons">
              <Link to="/login" className="nav-link">
                Login
              </Link>
              <Link to="/signup" className="btn-signup">
                Sign Up
              </Link>
            </div>
          ) : (
            <div className="user-menu">
              {role === "admin" && !isAdminPage && (
                <Link
                  to="/admin"
                  className="nav-link"
                  style={{ color: "#fbbf24" }}
                >
                  Admin Panel
                </Link>
              )}

              <div className="user-info">
                <div className="user-avatar">
                  <span>{role === "admin" ? "👑" : "👤"}</span>
                </div>
                <span className="user-name">
                  {userName ? userName.split(" ")[0] : "User"}
                </span>
              </div>

              <button onClick={handleLogout} className="btn-logout">
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu active">
          <div className="mobile-menu-content">
            <Link to="/" onClick={() => setMobileMenuOpen(false)}>
              🏠 Home
            </Link>

            {token ? (
              <>
                <Link to="/quiz" onClick={() => setMobileMenuOpen(false)}>
                  🧠 Explore Quiz
                </Link>
                <Link to="/badges" onClick={() => setMobileMenuOpen(false)}>
                  🏅 Badge Collection
                </Link>
                {role === "admin" && (
                  <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                    ⚡ Admin Panel
                  </Link>
                )}
                <button onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  🔐 Login
                </Link>
                <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                  ✨ Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
