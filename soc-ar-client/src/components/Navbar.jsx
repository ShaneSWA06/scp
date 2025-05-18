import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import "./Navbar.css"; // You'll create this

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const navbarOpen = useState(false);

  let role = null;

  if (token) {
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      role = decoded.role;
    } catch (err) {
      console.error("Invalid token");
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <nav
      className="navbar navbar-expand-lg navbar-dark"
      style={{ backgroundColor: "#0d6efd" }}
    >
      <div className="container">
        <Link className="navbar-brand fs-4 fw-semibold" to="/">
          SoC AR
        </Link>

        {/* Hamburger Toggle Button */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNavbar"
          aria-controls="mainNavbar"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Collapsible Section */}
        <div
          className={`collapse navbar-collapse justify-content-end ${
            navbarOpen ? "show" : ""
          }`}
          id="mainNavbar"
        >
          <ul className="navbar-nav align-items-center">
            <li className="nav-item">
              <Link className="nav-link fs-5" to="/">
                Home
              </Link>
            </li>
            {!token && (
              <>
                <li className="nav-item">
                  <Link className="nav-link fs-5" to="/login">
                    Login
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link fs-5" to="/signup">
                    Sign Up
                  </Link>
                </li>
              </>
            )}
            {role === "admin" && (
              <li className="nav-item">
                <Link className="nav-link fs-5 text-warning" to="/admin">
                  Admin
                </Link>
              </li>
            )}
            {token && (
              <li className="nav-item ms-lg-2 mt-2 mt-lg-0">
                <button
                  onClick={handleLogout}
                  className="btn btn-sm btn-light text-danger fw-semibold"
                >
                  Sign Out
                </button>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
