import React from 'react';
import './Services.css';

function Services() {
  const services = [
    {
      title: 'Commercial Construction',
      desc: 'Building state-of-the-art office spaces, malls, and corporate high-rises with modern engineering.',
      icon: '🏢',
      accent: 'var(--brand-yellow)'
    },
    {
      title: 'Residential Complexes',
      desc: 'Developing premium housing solutions and luxury apartments designed for modern living.',
      icon: '🏘️',
      accent: '#10b981'
    },
    {
      title: 'Infrastructure Development',
      desc: 'Executing heavy civil engineering projects including bridges, highways, and municipal structures.',
      icon: '🌉',
      accent: '#3b82f6'
    },
    {
      title: 'Project Consulting',
      desc: 'Providing expert structural analysis, cost estimation, and end-to-end project management.',
      icon: '📐',
      accent: '#8b5cf6'
    }
  ];

  return (
    <section id="services" className="services-container">
      <div className="services-header animate-fade-up">
        <h2 className="section-title">
          Our Core <span>Expertise</span>
        </h2>
        <p className="section-subtitle">
          Delivering unmatched quality and safety across every sector of the construction industry.
        </p>
      </div>

      <div className="services-grid">
        {services.map((srv, idx) => (
          <div 
            key={idx} 
            className={`service-card animate-fade-up delay-${(idx % 3) + 1}`}
            style={{ '--accent-color': srv.accent }}
          >
            <div className="service-icon-wrapper">
              <span className="service-icon">{srv.icon}</span>
              <div className="icon-glow"></div>
            </div>
            
            <h3>{srv.title}</h3>
            <p>{srv.desc}</p>
            
            <a href="#contact" className="service-link">
              Request a quote ➔
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Services;
