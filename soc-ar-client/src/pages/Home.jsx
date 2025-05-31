import React, { useState, useEffect } from "react";

function Home() {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate animated particles
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 2,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="home-container">
      {/* Animated Background */}
      <div className="background-gradient">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="particle"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Hero Content */}
      <div className="hero-content">
        <div className="hero-container">
          {/* Animated Icon */}
          <div className="hero-icon">
            <div className="icon-container">
              <div className="lightning-icon">⚡</div>
              <div className="pulse-ring"></div>
            </div>
          </div>

          {/* Main Headlines */}
          <div className="hero-text">
            <div className="welcome-text">🚀 Welcome to</div>

            <h1 className="main-title">
              <span className="gradient-text">SoC AR</span>
            </h1>

            <h2 className="sub-title">
              <span className="gradient-text-secondary">Time Machine</span>
            </h2>
          </div>

          {/* Description */}
          <p className="hero-description">
            Step into the past, explore the future — all in stunning
            <span className="highlight-text"> Augmented Reality</span>
          </p>

          {/* Call to Action Buttons */}
          <div className="cta-buttons">
            <button className="btn-primary">
              <span className="btn-icon">▶</span>
              <span>Explore Now</span>
              <span className="btn-arrow">→</span>
            </button>

            <button className="btn-secondary">
              <span className="btn-icon globe">🌍</span>
              <span>Watch Demo</span>
            </button>
          </div>

          {/* Stats Section */}
          <div className="stats-grid">
            <div className="stat-card stat-cyan">
              <div className="stat-icon">🌍</div>
              <div className="stat-number">500+</div>
              <div className="stat-label">Historical Milestones</div>
            </div>

            <div className="stat-card stat-purple">
              <div className="stat-icon">👥</div>
              <div className="stat-number">50K+</div>
              <div className="stat-label">Students Engaged</div>
            </div>

            <div className="stat-card stat-pink">
              <div className="stat-icon">🏆</div>
              <div className="stat-number">100+</div>
              <div className="stat-label">Schools Worldwide</div>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="features-grid">
            <div className="feature-item">🎯 Interactive Learning</div>
            <div className="feature-item">🌟 Immersive Experience</div>
            <div className="feature-item">📱 Mobile Compatible</div>
            <div className="feature-item">🏆 Achievement System</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
