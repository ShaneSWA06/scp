import { useState } from "react";
import axios from "axios";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [secondarySchool, setSecondarySchool] = useState("");
  const [secondaryLevel, setSecondaryLevel] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/users/register", {
        email,
        password,
        secondary_school: secondarySchool,
        secondary_level: secondaryLevel,
        full_name: fullName,
      });

      // Auto-login using the same credentials
      const loginRes = await axios.post("http://localhost:5000/users/login", {
        email,
        password,
      });

      // Store token and notify
      localStorage.setItem("token", loginRes.data.token);
      alert("Signup & Login successful!");

      // Optional: redirect to a dashboard or homepage
      window.location.href = "/";
    } catch (err) {
      if (err.response?.data?.errors) {
        const messages = err.response.data.errors.map((e) => e.msg).join("\n");
        alert(messages);
      } else {
        alert("Signup failed.");
      }
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center bg-light"
      style={{
        background: "linear-gradient(135deg, #e3f2fd, #90caf9)",
        minHeight: "100vh",
      }}
    >
      <div
        className="p-5 bg-white rounded shadow"
        style={{ minWidth: "350px" }}
      >
        <h2 className="mb-4 text-center text-success">📝 Sign Up</h2>
        <form onSubmit={handleSignup}>
          <div className="mb-3">
            <label className="form-label">Secondary School</label>
            <input
              type="text"
              className="form-control"
              required
              value={secondarySchool}
              onChange={(e) => setSecondarySchool(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Secondary Level</label>
            <div className="form-check">
              {["Sec 1", "Sec 2", "Sec 3", "Sec 4", "Sec 5", "Others"].map(
                (level) => (
                  <div key={level}>
                    <input
                      type="radio"
                      className="form-check-input"
                      name="secondaryLevel"
                      value={level}
                      checked={secondaryLevel === level}
                      onChange={(e) => setSecondaryLevel(e.target.value)}
                    />
                    <label className="form-check-label ms-2">{level}</label>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Name</label>
            <input
              type="text"
              className="form-control"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Email address</label>
            <input
              type="email"
              className="form-control"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-success w-100">
            Sign Up
          </button>
        </form>
      </div>
    </div>
  );
}

export default Signup;
