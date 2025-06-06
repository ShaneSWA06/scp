import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import AuthGuard from "./components/AuthGuard";
import AdminPanel from "./pages/AdminPanel";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Quiz from "./pages/Quiz";
import Badges from "./pages/Badges";
import ResourcesPage from "./pages/Resources";

function App() {
  const [particles, setParticles] = useState([]);

  // Initialize animated background particles
  useEffect(() => {
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      speed: Math.random() * 2 + 1,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <Router>
      <div className="min-h-screen">
        <Navbar />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home particles={particles} />} />
          <Route path="/login" element={<Login particles={particles} />} />
          <Route path="/signup" element={<Signup particles={particles} />} />

          {/* Protected Routes - Require Authentication */}
          <Route
            path="/quiz"
            element={
              <AuthGuard>
                <Quiz />
              </AuthGuard>
            }
          />
          <Route
            path="/badges"
            element={
              <AuthGuard>
                <Badges />
              </AuthGuard>
            }
          />
          <Route
            path="/resources"
            element={
              <AuthGuard>
                <ResourcesPage />
              </AuthGuard>
            }
          />
          <Route
            path="/admin"
            element={
              <AuthGuard>
                <AdminPanel />
              </AuthGuard>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
