import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, saveSession } from '../api';
import './Login.css';

/**
 * Login — POSTs to /api/login (Spring Boot, MySQL)
 * On SUCCESS: saves session and routes based on role:
 *   ADMIN    → /admin-dashboard
 *   STANDARD → /employee-dashboard
 */
function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const { ok, data } = await loginUser(email, password);

      if (ok && data.status === 'SUCCESS') {
        saveSession(data); // role, email, optional JWT (accessToken / token)

        // Route based on role from the database
        if (data.role === 'ADMIN') {
          navigate('/admin-dashboard');
        } else {
          navigate('/employee-dashboard');
        }
      } else {
        setErrorMessage(data.message || 'Invalid email or password. Please try again.');
      }
    } catch {
      setErrorMessage('Could not connect to the backend server. Is it running on port 8080?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>System Portal</h2>
        <p>Please log in to access your dashboard.</p>

        {errorMessage && (
          <div style={{
            color: '#f87171', background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            padding: '10px 14px', borderRadius: '8px', marginBottom: '18px',
            fontSize: '0.88rem', textAlign: 'left'
          }}>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;