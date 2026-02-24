import { supabase } from "../supabase/client";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export function useRequireAuth() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        
        if (!data.session) {
          // No Supabase session, clear localStorage and redirect
          localStorage.removeItem("userSession");
          router.replace("/login");
          return;
        }

        // Get user role from user metadata
        const userRole = data.session.user?.user_metadata?.role;
        
        // Also check localStorage for role consistency
        const localSession = localStorage.getItem("userSession");
        if (localSession) {
          const parsed = JSON.parse(localSession);
          
          // If roles don't match, update localStorage
          if (parsed.role !== userRole) {
            localStorage.setItem("userSession", JSON.stringify({
              loggedIn: true,
              user_id: data.session.user.id,
              email: data.session.user.email,
              full_name: data.session.user.user_metadata?.full_name || data.session.user.email?.split('@')[0],
              role: userRole,
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              timestamp: Date.now()
            }));
          }
        }

        // Check if current route matches user role
        const path = router.pathname;
        const isCandidateRoute = path.startsWith('/candidate');
        const isSupervisorRoute = path.startsWith('/supervisor') || path.startsWith('/admin');
        
        if (userRole === 'candidate' && isSupervisorRoute) {
          router.replace('/candidate/dashboard');
          return;
        }
        
        if ((userRole === 'supervisor' || userRole === 'admin') && isCandidateRoute) {
          router.replace('/supervisor');
          return;
        }

        setSession(data.session);
        setLoading(false);
        
      } catch (error) {
        console.error("Auth check error:", error);
        router.replace("/login");
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem("userSession");
        router.replace("/login");
      } else if (event === 'SIGNED_IN' && session) {
        // Update localStorage with new session
        const userRole = session.user?.user_metadata?.role;
        localStorage.setItem("userSession", JSON.stringify({
          loggedIn: true,
          user_id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          role: userRole,
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          timestamp: Date.now()
        }));
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router]);

  return { session, loading };
}
