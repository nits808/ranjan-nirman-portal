import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import ProtectedRoute from './ProtectedRoute';
import { saveSession, clearSession } from '../api';

beforeEach(() => {
  clearSession();
});

function harness(child, path = '/employee-dashboard') {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/employee-dashboard"
          element={<ProtectedRoute allowedRoles={['STANDARD']}>{child}</ProtectedRoute>}
        />
        <Route path="/admin-dashboard" element={<div>Admin</div>} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('redirects to login when not authenticated', () => {
    render(harness(<div>Employee</div>));
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('renders children for allowed role', () => {
    saveSession({ role: 'STANDARD', email: 'a@b.com' });
    render(harness(<div>Employee home</div>));
    expect(screen.getByText('Employee home')).toBeInTheDocument();
  });

  it('redirects STANDARD away from admin-only route', () => {
    saveSession({ role: 'STANDARD', email: 'a@b.com' });
    render(
      <MemoryRouter initialEntries={['/admin-dashboard']}>
        <Routes>
          <Route
            path="/admin-dashboard"
            element={<ProtectedRoute allowedRoles={['ADMIN']}><div>Admin panel</div></ProtectedRoute>}
          />
          <Route path="/employee-dashboard" element={<div>Employee dash</div>} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Employee dash')).toBeInTheDocument();
  });
});
