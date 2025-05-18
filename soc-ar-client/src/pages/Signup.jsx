import { useState } from "react";
import axios from "axios";

function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/users/register", {
        username,
        email,
        password,
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
      alert("Signup failed. Try a different email.");
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center bg-light"
      style={{ height: "90vh" }}
    >
      <div
        className="p-5 bg-white rounded shadow"
        style={{ minWidth: "350px" }}
      >
        <h2 className="mb-4 text-center text-success">📝 Sign Up</h2>
        <form onSubmit={handleSignup}>
          <div className="mb-3">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              required
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Email address</label>
            <input
              type="email"
              className="form-control"
              required
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              required
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
