// utils/requireAuth.js

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../supabase/client";

function getSafeRole(session) {
  return session?.user?.user_metadata?.role || null;
}

function getSafeName(session) {
  return session?.user?.user_metadata?.full_name || session?.user?.email?.split("@")[0] || "User";
}

function buildLocalSession(session, roleOverride) {
  const role = roleOverride || getSafeRole(session) || "candidate";

  return {
    loggedIn: true,
    user_id: session.user.id,
    email: session.user.email,
    full_name: getSafeName(session),
    role,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    timestamp: Date.now()
  };
}

function safeWriteLocalSession(session, roleOverride) {
  if (typeof window === "undefined" || !session?.user) return;

  try {
    localStorage.setItem("userSession", JSON.stringify(buildLocalSession(session, roleOverride)));
  } catch (error) {
    console.error("Unable to write local session:", error);
  }
}

function safeClearLocalSession() {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem("userSession");
  } catch (error) {
    console.error("Unable to clear local session:", error);
  }
}

function getRouteAccess(pathname) {
  const path = pathname || "";

  return {
    isCandidateRoute: path.startsWith("/candidate"),
    isSupervisorRoute: path.startsWith("/supervisor"),
    isAdminRoute: path.startsWith("/admin"),
    isAssessmentRoute: path.startsWith("/assessment")
  };
}

function getRedirectForRole(role, pathname) {
  const access = getRouteAccess(pathname);

  if (!role) return null;

  if (role === "candidate") {
    if (access.isSupervisorRoute || access.isAdminRoute) return "/candidate/dashboard";
    return null;
  }

  if (role === "supervisor") {
    if (access.isCandidateRoute || access.isAdminRoute) return "/supervisor";
    return null;
  }

  if (role === "admin") {
    if (access.isCandidateRoute) return "/admin";
    return null;
  }

  return null;
}

export function useRequireAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        setLoading(true);

        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth session error:", error);
        }

        const activeSession = data?.session || null;

        if (!activeSession) {
          safeClearLocalSession();
          if (mounted) {
            setSession(null);
            setRole(null);
            setLoading(false);
          }
          router.replace("/login");
          return;
        }

        const userRole = getSafeRole(activeSession) || "candidate";
        const redirectTo = getRedirectForRole(userRole, router.pathname);

        safeWriteLocalSession(activeSession, userRole);

        if (mounted) {
          setSession(activeSession);
          setRole(userRole);
          setLoading(false);
        }

        if (redirectTo && router.pathname !== redirectTo) {
          router.replace(redirectTo);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        safeClearLocalSession();
        if (mounted) {
          setSession(null);
          setRole(null);
          setLoading(false);
        }
        router.replace("/login");
      }
    }

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        safeClearLocalSession();
        setSession(null);
        setRole(null);
        setLoading(false);
        router.replace("/login");
        return;
      }

      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") && nextSession) {
        const nextRole = getSafeRole(nextSession) || "candidate";
        safeWriteLocalSession(nextSession, nextRole);
        setSession(nextSession);
        setRole(nextRole);
        setLoading(false);

        const redirectTo = getRedirectForRole(nextRole, router.pathname);
        if (redirectTo && router.pathname !== redirectTo) {
          router.replace(redirectTo);
        }
      }
    });

    return () => {
      mounted = false;
      if (authListener?.subscription) authListener.subscription.unsubscribe();
    };
  }, [router.pathname]);

  return { session, loading, role };
}
