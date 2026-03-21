import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Portal error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '50vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
            fontFamily: 'var(--sans, system-ui, sans-serif)',
            color: 'var(--text-primary, #1a1a1a)',
          }}
        >
          <h1 style={{ fontSize: '1.25rem', marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ color: 'var(--text-secondary, #666)', marginBottom: 24, textAlign: 'center', maxWidth: 420 }}>
            Please refresh the page. If the problem continues, contact your administrator.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: '1px solid var(--border-glass-hover, #ddd)',
              background: 'var(--surface-1, #fff)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
