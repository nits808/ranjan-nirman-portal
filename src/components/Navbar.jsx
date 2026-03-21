import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRole, isLoggedIn } from '../api';
import { useTheme } from '../context/ThemeContext';
import './Navbar.css';

function Navbar() {
  const navigate = useNavigate();
  const role = getRole();
  const { theme, toggle } = useTheme();

  const handlePortalClick = () => {
    if (!isLoggedIn()) {
      navigate('/login');
      return;
    }
    if (role === 'ADMIN') navigate('/admin-dashboard');
    else if (role === 'STANDARD') navigate('/employee-dashboard');
    else navigate('/login');
  };

  return (
    <nav className="navbar" aria-label="Primary">
      <Link to="/" className="logo-link">
        <div className="logo">
          <img src="/logo.jpg" alt="Ranjan Nirman Sewa Logo" className="logo-image" />
        </div>
      </Link>

      <ul className="nav-links">
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <a href="/#services">Services</a>
        </li>
        <li>
          <a href="/#contact">Contact</a>
        </li>
        <li className="nav-links__actions">
          <button
            type="button"
            className="nav-theme-btn"
            onClick={toggle}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button type="button" className="admin-btn" onClick={handlePortalClick}>
            {isLoggedIn() ? 'Dashboard' : 'Portal Login'}
          </button>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
