import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { username, loading } = useAuth();
  if (loading) return <p>Loading…</p>;
  return username ? <>{children}</> : <Navigate to="/LoginForm" replace />;
}