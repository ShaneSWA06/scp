import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav
      className="navbar navbar-expand-lg navbar-dark"
      style={{ backgroundColor: "#0d6efd" }}
    >
      <div className="container">
        <Link className="navbar-brand fs-4" to="/">
          SoC AR
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navMenu"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div
          className="collapse navbar-collapse justify-content-end"
          id="navMenu"
        >
          <ul className="navbar-nav">
            <li className="nav-item">
              <Link className="nav-link fs-5" to="/">
                Home
              </Link>
            </li>
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
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
