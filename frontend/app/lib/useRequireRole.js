'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';

/**
 * Redirects to /login if unauthenticated, or to the correct dashboard if
 * the signed-in user's role doesn't match the page they're trying to view
 * (e.g. a student hitting /dashboard/parent directly via URL).
 */
export function useRequireRole(requiredRole) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== requiredRole) {
      router.replace(`/dashboard/${user.role}`);
    }
  }, [user, loading, requiredRole, router]);

  return { user, ready: !loading && user?.role === requiredRole };
}
