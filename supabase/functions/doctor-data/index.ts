/**
 * MediPoint doctor data (Supabase Edge Function)
 *
 * Returns the latest profile records from the shared profiles table so the
 * doctor portal can render current data without relying on stale browser storage.
 */

import { corsHeaders, jsonResponse } from '../_shared/cors.js';
import { createAdminClient } from '../_shared/supabase-admin.js';
import { mapProfileRowToUser, normalizeRole } from '../_shared/profile-mapper.js';

function mapProfileToDoctorUser(profile: Record<string, unknown>) {
  const user = mapProfileRowToUser(profile, 'portal');
  return {
    ...user,
    role: normalizeRole(profile.role),
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'GET' && request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server configuration error.';
    return jsonResponse({ error: message }, 500);
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name');

  if (error) {
    return jsonResponse({ error: error.message || 'Unable to load doctor data.' }, 500);
  }

  const users = (Array.isArray(profiles) ? profiles : [])
    .map((profile) => mapProfileToDoctorUser(profile as Record<string, unknown>))
    .filter((user) => user.role === 'student' || user.role === 'personnel' || user.role === 'doctor');

  return jsonResponse({ ok: true, profiles: users, count: users.length });
});
