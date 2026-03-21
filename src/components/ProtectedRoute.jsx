import { Navigate, useLocation } from 'react-router-dom';
import { getRole, isLoggedIn } from '../api';

/**
 * Guards dashboard routes. Redirects unauthenticated users to /login.
 * If `allowedRoles` is set, only those roles may access; others go to their home dashboard.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();
  const role = getRole();

  if (!isLoggedIn()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    if (role === 'ADMIN') return <Navigate to="/admin-dashboard" replace />;
    if (role === 'STANDARD') return <Navigate to="/employee-dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
}
