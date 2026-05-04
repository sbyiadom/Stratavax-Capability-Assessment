// supabase/client.js

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function createBrowserStorage() {
  if (typeof window === "undefined") return undefined;

  return {
    getItem: (key) => {
      try {
        return window.localStorage.getItem(key);
      } catch (error) {
        console.error("Supabase storage getItem error:", error);
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        window.localStorage.setItem(key, value);
      } catch (error) {
        console.error("Supabase storage setItem error:", error);
      }
    },
    removeItem: (key) => {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        console.error("Supabase storage removeItem error:", error);
      }
    }
  };
}

function validateSupabaseConfig() {
  if (!supabaseUrl) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
  }

  if (!supabaseAnonKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.");
  }
}

validateSupabaseConfig();

const globalForSupabase = typeof globalThis !== "undefined" ? globalThis : global;

if (!globalForSupabase.__STRATAVAX_SUPABASE_CLIENT__) {
  globalForSupabase.__STRATAVAX_SUPABASE_CLIENT__ = createClient(supabaseUrl || "", supabaseAnonKey || "", {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: createBrowserStorage(),
      storageKey: "stratavax-auth-session"
    },
    global: {
      headers: {
        "x-application-name": "stratavax-assessment-platform"
      }
    }
  });
}

export const supabase = globalForSupabase.__STRATAVAX_SUPABASE_CLIENT__;
export default supabase;
