// utils/fetchWithAuth.js
// Phase 7A — a drop-in fetch wrapper that attaches the current Supabase
// session's access token as an Authorization: Bearer header.
//
// Usage:
//   import { fetchWithAuth } from '../utils/fetchWithAuth';
//   const res = await fetchWithAuth('/api/admin/whatever', { method: 'POST', body: ... });
//
// Anything you'd pass to fetch, pass to this. Headers merge with the
// Authorization header. If the caller provides a Content-Type, it's
// preserved; otherwise we set it to application/json when there's a body.
//
// If there is no active session, the request is still sent (without the
// header) so the endpoint can return a clean 401 — which the page can
// handle by redirecting to login.

import { supabase } from '../supabase/client';

export async function fetchWithAuth(url, options = {}) {
  let token = null;
  try {
    const { data } = await supabase.auth.getSession();
    token = data?.session?.access_token || null;
  } catch (err) {
    console.error('[fetchWithAuth] failed to read session:', err);
  }

  const incomingHeaders = options.headers || {};
  const headers = {
    ...incomingHeaders,
  };

  if (token && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Only add Content-Type when a body is present and no Content-Type was set
  // by the caller. Blob/FormData handles its own Content-Type.
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const isBlob = typeof Blob !== 'undefined' && options.body instanceof Blob;
  const hasBody = options.body !== undefined && options.body !== null;

  if (hasBody && !isFormData && !isBlob && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
