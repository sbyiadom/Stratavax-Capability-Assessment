// utils/scoping.js
// Phase 7A — server-side access scoping helper.
//
// Decision: STRICT SCOPING (Option A).
//   • admin       → sees all candidates (returns null = "no restriction")
//   • supervisor  → sees only candidates where they are the primary
//                   (candidate_profiles.supervisor_id) OR assigned via
//                   the junction table (candidate_supervisors.supervisor_id)
//   • everyone else → sees nothing

export async function resolveCallerRole(serviceClient, userId, userMetadata = null) {
  const { data: profile, error } = await serviceClient
    .from('supervisor_profiles')
    .select('id, role, is_active')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[scoping] supervisor_profiles lookup failed', {
      message: error.message,
      code: error.code,
      userId,
    });
  }

  const resolvedRole = profile?.role || userMetadata?.role || null;

  return {
    role: resolvedRole,
    isAdmin: resolvedRole === 'admin',
    isSupervisor: resolvedRole === 'supervisor',
    isActive: profile ? profile.is_active !== false : true,
  };
}

export async function getAccessibleCandidateIds(serviceClient, caller) {
  if (!caller || !caller.userId) {
    return [];
  }

  if (caller.isAdmin) {
    return null;
  }

  if (!caller.isSupervisor) {
    return [];
  }

  const supervisorId = caller.userId;
  const ids = new Set();

  const { data: primaryRows, error: primaryError } = await serviceClient
    .from('candidate_profiles')
    .select('id')
    .eq('supervisor_id', supervisorId);

  if (primaryError) {
    console.error('[scoping] primary candidates lookup failed', {
      message: primaryError.message,
      code: primaryError.code,
      supervisorId,
    });
  } else {
    (primaryRows || []).forEach((row) => {
      if (row?.id) ids.add(row.id);
    });
  }

  const { data: junctionRows, error: junctionError } = await serviceClient
    .from('candidate_supervisors')
    .select('candidate_id')
    .eq('supervisor_id', supervisorId);

  if (junctionError) {
    console.error('[scoping] junction candidates lookup failed', {
      message: junctionError.message,
      code: junctionError.code,
      supervisorId,
    });
  } else {
    (junctionRows || []).forEach((row) => {
      if (row?.candidate_id) ids.add(row.candidate_id);
    });
  }

  return [...ids];
}

export async function canAccessCandidate(serviceClient, caller, candidateId) {
  if (!caller || !candidateId) return false;
  if (caller.isAdmin) return true;
  if (!caller.isSupervisor) return false;

  const allowed = await getAccessibleCandidateIds(serviceClient, caller);
  if (allowed === null) return true;
  return allowed.includes(candidateId);
}

export async function filterAccessibleCandidateIds(serviceClient, caller, candidateIds) {
  if (!Array.isArray(candidateIds) || candidateIds.length === 0) return [];

  const allowed = await getAccessibleCandidateIds(serviceClient, caller);
  if (allowed === null) return candidateIds;

  const allowedSet = new Set(allowed);
  return candidateIds.filter((id) => allowedSet.has(id));
}

export default {
  resolveCallerRole,
  getAccessibleCandidateIds,
  canAccessCandidate,
  filterAccessibleCandidateIds,
};
