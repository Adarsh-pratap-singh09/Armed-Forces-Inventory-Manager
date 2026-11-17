import { Navigate } from 'react-router-dom';

/**
 * Legacy Fleet route wrapper: redirects to /maintenance
 */
export default function Fleet() {
  return <Navigate to="/maintenance" replace />;
}
