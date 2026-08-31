"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const publicRoutes = ['/login', '/reset-password'];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      const loggedIn = !!session;
      setIsAuthenticated(loggedIn);

      if (!loggedIn && !isPublicRoute) {
        router.replace('/login');
      } else if (loggedIn && isPublicRoute) {
        router.replace('/');
      }
    });

    // 2. Listen for auth state changes (e.g. sign out, sign in, session expiry)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const loggedIn = !!session;
      setIsAuthenticated(loggedIn);

      if (event === 'SIGNED_OUT' || (!session && !isPublicRoute)) {
        router.replace('/login');
      } else if (session && isPublicRoute) {
        router.replace('/');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, isPublicRoute, router]);

  // While checking initial session status on protected routes, show loading spinner
  if (isAuthenticated === null && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-[#6b7773]">Verificando sesión del comercio...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and on protected route, do not render children (wait for router redirect)
  if (!isAuthenticated && !isPublicRoute) {
    return null;
  }

  return <>{children}</>;
}
