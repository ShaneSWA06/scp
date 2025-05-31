import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    secondarySchool: "",
    secondaryLevel: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      console.log("Attempting signup with data:", {
        full_name: formData.fullName,
        email: formData.email,
        secondary_school: formData.secondarySchool,
        secondary_level: formData.secondaryLevel,
      });

      const signupResponse = await axios.post(
        "http://localhost:5000/users/register",
        {
          full_name: formData.fullName,
          email: formData.email,
          password: formData.password,
          secondary_school: formData.secondarySchool,
          secondary_level: formData.secondaryLevel,
        }
      );

      console.log("Signup successful:", signupResponse.data);

      // Auto-login after successful registration
      const loginRes = await axios.post("http://localhost:5000/users/login", {
        email: formData.email,
        password: formData.password,
      });

      console.log("Auto-login successful:", loginRes.data);

      localStorage.setItem("token", loginRes.data.token);
      alert("Signup & Login successful!");
      navigate("/");
    } catch (err) {
      console.error("Signup error:", err);

      if (err.response?.data?.errors) {
        const messages = err.response.data.errors.map((e) => e.msg).join(", ");
        setError(messages);
        alert(`Validation errors: ${messages}`);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
        alert(`Error: ${err.response.data.message}`);
      } else if (err.message === "Network Error") {
        setError(
          "Cannot connect to server. Please check if the backend is running on http://localhost:5000"
        );
        alert(
          "Cannot connect to server. Please check if the backend is running on http://localhost:5000"
        );
      } else {
        setError(`Signup failed: ${err.message}`);
        alert(`Signup failed: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Animated Background */}
      <div className="auth-background">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
        </div>
      </div>

      {/* Signup Content */}
      <div className="auth-content">
        <div className="auth-card signup-card">
          {/* Header */}
          <div className="auth-header">
            <div className="auth-icon signup-icon">
              <div className="user-icon">👥</div>
            </div>
            <h2 className="auth-title">Join SoC AR</h2>
            <p className="auth-subtitle">Start your AR learning journey</p>
          </div>

          {/* Error Message */}
          {error && <div className="error-message">{error}</div>}

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="auth-form">
            {/* Full Name */}
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <div className="input-container">
                <div className="input-icon">👤</div>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="auth-input"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>

            {/* Secondary School */}
            <div className="input-group">
              <label className="input-label">Secondary School</label>
              <div className="input-container">
                <div className="input-icon">🏫</div>
                <input
                  type="text"
                  name="secondarySchool"
                  value={formData.secondarySchool}
                  onChange={handleChange}
                  className="auth-input"
                  placeholder="Enter your school name"
                  required
                />
              </div>
            </div>

            {/* Secondary Level */}
            <div className="input-group">
              <label className="input-label">Secondary Level</label>
              <div className="input-container">
                <div className="input-icon">📚</div>
                <select
                  name="secondaryLevel"
                  value={formData.secondaryLevel}
                  onChange={handleChange}
                  className="auth-input auth-select"
                  required
                >
                  <option value="">Select level</option>
                  <option value="Sec 1">Sec 1</option>
                  <option value="Sec 2">Sec 2</option>
                  <option value="Sec 3">Sec 3</option>
                  <option value="Sec 4">Sec 4</option>
                  <option value="Sec 5">Sec 5</option>
                  <option value="Others">Others</option>
                </select>
              </div>
            </div>

            {/* Email */}
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <div className="input-container">
                <div className="input-icon">📧</div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="auth-input"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="input-container">
                <div className="input-icon">🔒</div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="auth-input"
                  placeholder="Create a password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Signup Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`auth-button secondary ${isLoading ? "loading" : ""}`}
            >
              {isLoading ? (
                <>
                  <div className="spinner"></div>
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <span className="button-arrow">→</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="auth-footer">
            <span className="footer-text">Already have an account? </span>
            <button onClick={() => navigate("/login")} className="footer-link">
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;
