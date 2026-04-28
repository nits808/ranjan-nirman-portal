import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Login from './components/Login';
import EmployeeDashboard from './components/EmployeeDashboard';
import AdminDashboard from './components/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import SkipLink from './components/SkipLink';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import { getRole } from './api';

function AuthRedirect({ children }) {
  const role = getRole();
  if (role === 'ADMIN') return <Navigate to="/admin-dashboard" replace />;
  if (role === 'STANDARD') return <Navigate to="/employee-dashboard" replace />;
  return children;
}

import ChatbotWidget from './components/ChatbotWidget';

function App() {
  return (
    <ErrorBoundary>
      <SkipLink />
      <BrowserRouter>
        <KeyboardShortcutsModal />
        <Navbar />
        <main id="main-content" style={{ flex: 1, width: '100%', minHeight: 0 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/login"
              element={
                <AuthRedirect>
                  <Login />
                </AuthRedirect>
              }
            />
            <Route
              path="/employee-dashboard"
              element={
                <ProtectedRoute allowedRoles={['STANDARD']}>
                  <EmployeeDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
        <ChatbotWidget />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
