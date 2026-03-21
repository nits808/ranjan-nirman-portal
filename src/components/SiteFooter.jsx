import React from 'react';
import { Link } from 'react-router-dom';
import './SiteFooter.css';

export default function SiteFooter() {
  const y = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <strong>Ranjan Nirman Sewa</strong>
          <span>Construction · Engineering · Infrastructure · Nepal</span>
        </div>
        <nav className="site-footer__nav" aria-label="Footer">
          <Link to="/">Home</Link>
          <a href="/#services">Services</a>
          <a href="/#contact">Contact</a>
          <Link to="/login">Portal</Link>
        </nav>
        <div className="site-footer__meta">
          <span>© {y} Ranjan Nirman Sewa. All rights reserved.</span>
          <span className="site-footer__tagline">Built for safety, precision, and lasting quality.</span>
        </div>
      </div>
    </footer>
  );
}
