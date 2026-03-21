import React from 'react';
import './Hero.css';

function Hero() {
  return (
    <section className="hero-container">
      {/* Decorative floating blurred blobs for depth */}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>

      <div className="hero-content animate-fade-up">
        {/* Animated premium badge */}
        <div className="hero-badge delay-1">
          <span className="pulse-dot"></span>
          Nepal's Premier Construction Partner
        </div>

        {/* Dynamic Typography Header */}
        <h1 className="hero-title delay-2">
          Building the Future<br />
          with <span className="gradient-text">Excellence</span>
        </h1>

        <p className="hero-subtitle delay-3">
          Ranjan Nirman Sewa provides top-tier construction, infrastructure
          development, and project management services across Nepal. Engineered for longevity.
        </p>

        <div className="hero-buttons delay-3">
          <a href="#services" className="primary-btn glass-hover">Explore Services</a>
          <a href="#contact" className="secondary-btn">Request a quote</a>
        </div>
      </div>

      {/* Floating glass stats strip overlapping the next section */}
      <div className="hero-stats-wrapper">
        <div className="hero-stats glass-card animate-fade-up delay-3">
          {[
            { n: '120+', l: 'Projects Delivered' },
            { n: '15+',  l: 'Years Experience' },
            { n: '80+',  l: 'Expert Engineers' },
            { n: '₹2B+', l: 'Capital Managed' }
          ].map((s, i) => (
            <div key={i} className="hero-stat-box">
              <span className="hero-stat-number">{s.n}</span>
              <span className="hero-stat-label">{s.l}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Hero;