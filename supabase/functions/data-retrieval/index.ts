/**
 * MediPoint data retrieval (Supabase Edge Function)
 *
 * Returns profile and assessment data for kiosk/portal/doctor views.
 */

import { corsHeaders, jsonResponse } from '../_shared/cors.js';
import { createAdminClient } from '../_shared/supabase-admin.js';
import { mapAssessmentRows } from '../_shared/assessment-db.js';
import { mapProfileRowToUser, normalizeText } from '../_shared/profile-mapper.js';

function normalizeRole(value) {
  const role = normalizeText(value).toLowerCase();
  return role === 'doctor' ? 'doctor' : role === 'personnel' ? 'personnel' : 'student';
}

function mapProfileToUser(profile) {
  return mapProfileRowToUser(profile, 'supabase');
}

async function fetchProfile(
  supabase,
  profileId,
) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

async function fetchAssessments(
  supabase,
  profileId,
  profile,
) {
  const { data, error } = await supabase
    .from('assessments')
    .select(`
      *,
      assessment_results (*)
    `)
    .eq('profile_id', profileId)
    .order('assessed_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((assessment) =>
    mapAssessmentRows(assessment, assessment.assessment_results || [], profile)
  );
}

async function fetchProfilesForDoctor(
  supabase,
  role,
) {
  const normalizedRole = normalizeRole(role);
  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });

  if (normalizedRole === 'student' || normalizedRole === 'personnel') {
    query = query.in('role', [normalizedRole, 'student', 'personnel']);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return data.map(mapProfileToUser);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch (_error) {
    return jsonResponse({ error: 'Request body must be valid JSON.' }, 400);
  }

  const action = normalizeText(body.action ?? '').toLowerCase();
  const profileId = normalizeText(body.profileId ?? '');
  const requestedRole = normalizeText(body.role ?? '');
  const idNumber = normalizeText(body.idNumber ?? body.studentNumber ?? '');

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server configuration error.';
    return jsonResponse({ error: message }, 500);
  }

  if (action === 'doctor-list') {
    const profiles = await fetchProfilesForDoctor(supabase, requestedRole);
    return jsonResponse({ ok: true, profiles });
  }

  let profile = null;
  if (profileId) {
    profile = await fetchProfile(supabase, profileId);
  }

  if (!profile && idNumber) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id_number', idNumber)
      .maybeSingle();

    if (!error && data) {
      profile = data;
    }
  }

  if (!profile) {
    return jsonResponse({ error: 'Profile not found.' }, 404);
  }

  const assessments = await fetchAssessments(supabase, profile.id, profile);

  return jsonResponse({
    ok: true,
    user: mapProfileToUser(profile),
    assessments,
  });
});
