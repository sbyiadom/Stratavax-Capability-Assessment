// utils/apiAuth.js
// Phase 7A — shared auth helpers for API routes.
//
// Every admin/supervisor endpoint uses these to verify the caller's token
// and role before touching data. Centralized so:
//   • the auth pattern is identical across all endpoints
//   • future endpoints get auth by default (import + one call)
//   • changes to the auth logic don't require touching 30+ files
//
// Usage in a handler:
//
//   import { authorizeRequest } from '../../../utils/apiAuth';
//
//   export default async function handler(req, res) {
//     if (req.method !== 'POST') { ... }
//
//     const auth = await authorizeRequest(req, ['admin']);
//     if (auth.error) {
//       return res.status(auth.status).json({ success: false, error: auth.error });
//     }
//
//     const { serviceClient, caller } = auth;
//     // ... use serviceClient for all data access
//   }

import { createClient } from '@supabase/supabase-js';

export function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service credentials');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing Supabase anon credentials');
  }
  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function extractBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  return authHeader.startsWith('Bearer ')
    ? authHeader.replace('Bearer ', '').trim()
    : null;
}

export async function resolveCaller({ serviceClient, authClient, token, allowedRoles }) {
  if (!token) {
    return { error: 'Unauthorized: No token provided', status: 401 };
  }

  const { data: userData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !userData?.user) {
    return { error: 'Unauthorized: Invalid token', status: 401 };
  }

  const { data: profile, error: profileError } = await serviceClient
    .from('supervisor_profiles')
    .select('id, role, is_active')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[apiAuth] profile lookup failed:', profileError.message);
    return { error: 'Unable to verify caller identity', status: 500 };
  }

  const metadataRole = userData.user.user_metadata?.role || null;
  const role = profile?.role || metadataRole;

  if (profile?.is_active === false) {
    return { error: 'Account is inactive', status: 403 };
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return { error: `${allowedRoles.join(' or ')} access required`, status: 403 };
  }

  return {
    userId: userData.user.id,
    role,
    isAdmin: role === 'admin',
    isSupervisor: role === 'supervisor',
  };
}

export async function authorizeRequest(req, allowedRoles = ['admin']) {
  let serviceClient;
  let authClient;

  try {
    serviceClient = getServiceClient();
    authClient = getAuthClient();
  } catch (err) {
    console.error('[apiAuth] client init failed:', err.message);
    return { error: 'Server configuration error', status: 500 };
  }

  const token = extractBearerToken(req);
  const caller = await resolveCaller({ serviceClient, authClient, token, allowedRoles });

  if (caller.error) {
    return { error: caller.error, status: caller.status };
  }

  return { caller, serviceClient, authClient };
}
