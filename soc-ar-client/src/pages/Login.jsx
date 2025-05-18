import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/users/login", {
        email,
        password,
      });
      alert("Login successful!");
      navigate("/"); // ⬅ Redirects to Home
      localStorage.setItem("token", res.data.token);
    } catch (err) {
      alert("Login failed. Please check your credentials.");
    }
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #e3f2fd, #90caf9)",
        minHeight: "100vh",
      }}
      className="d-flex justify-content-center align-items-center"
    >
      <div
        className="p-5 bg-white rounded shadow"
        style={{ minWidth: "350px" }}
      >
        <h2 className="mb-4 text-center text-primary">🔐 Login</h2>
        <form onSubmit={handleLogin}>
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
          <button type="submit" className="btn btn-primary w-100">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
