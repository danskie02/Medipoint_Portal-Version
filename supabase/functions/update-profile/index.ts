/**
 * MediPoint profile update (Supabase Edge Function)
 *
 * Persists completed portal profile details to the shared profiles table.
 */

import { corsHeaders, jsonResponse } from '../_shared/cors.js';
import { createAdminClient } from '../_shared/supabase-admin.js';
import {
  buildProfileUpdatePayload,
  mapProfileRowToUser,
  normalizeText,
} from '../_shared/profile-mapper.js';

async function resolveProfile(
  supabase: ReturnType<typeof createAdminClient>,
  profileId: string,
  idNumber: string,
) {
  if (profileId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle();

    if (!error && data) {
      return data as Record<string, unknown>;
    }
  }

  if (idNumber) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id_number', idNumber)
      .maybeSingle();

    if (!error && data) {
      return data as Record<string, unknown>;
    }
  }

  return null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch (_error) {
    return jsonResponse({ error: 'Request body must be valid JSON.' }, 400);
  }

  const profileId = normalizeText(body.profileId ?? body.id ?? '');
  const idNumber = normalizeText(body.idNumber ?? body.studentNumber ?? '');
  const { payload: updatePayload } = buildProfileUpdatePayload(body);

  if (!profileId && !idNumber) {
    return jsonResponse({ error: 'A profile ID or ID number is required.' }, 400);
  }

  if (!updatePayload.full_name || !updatePayload.email || !updatePayload.phone ||
      !updatePayload.emergency_contact_name || !updatePayload.emergency_phone) {
    return jsonResponse({ error: 'Please complete all required profile fields.' }, 400);
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server configuration error.';
    return jsonResponse({ error: message }, 500);
  }

  const existingProfile = await resolveProfile(supabase, profileId, idNumber);
  if (!existingProfile) {
    return jsonResponse({ error: 'Profile not found.' }, 404);
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', existingProfile.id)
    .select('*')
    .single();

  if (error || !profile) {
    return jsonResponse({ error: error?.message || 'Unable to update profile.' }, 500);
  }

  return jsonResponse({
    ok: true,
    user: mapProfileRowToUser(profile as Record<string, unknown>, 'portal'),
  });
});
