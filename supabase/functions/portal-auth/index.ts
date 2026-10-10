/**
 * MediPoint portal auth (Supabase Edge Function)
 *
 * Supports portal login and sign-up using the shared profiles table.
 */

import { corsHeaders, jsonResponse } from '../_shared/cors.js';
import { createAdminClient } from '../_shared/supabase-admin.js';
import { mapProfileRowToUser, normalizeRole, normalizeText } from '../_shared/profile-mapper.js';

function normalizeName(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function mapProfileToPortalUser(profile: Record<string, unknown>) {
  return mapProfileRowToUser(profile, 'portal');
}

async function loginPortal(
  supabase: ReturnType<typeof createAdminClient>,
  body: Record<string, unknown>,
) {
  const name = normalizeText(body.name ?? body.fullName ?? '');
  const idNumber = normalizeText(body.idNumber ?? body.studentNumber ?? '');

  if (!name || !idNumber) {
    return { error: 'Please enter your full name and ID number.', status: 400 };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id_number', idNumber)
    .maybeSingle();

  if (error || !profile) {
    return { error: 'Full name or ID number is incorrect.', status: 404 };
  }

  if (normalizeName(profile.full_name) !== normalizeName(name)) {
    return { error: 'Full name or ID number is incorrect.', status: 401 };
  }

  return { user: mapProfileToPortalUser(profile as Record<string, unknown>) };
}

async function signupPortal(
  supabase: ReturnType<typeof createAdminClient>,
  body: Record<string, unknown>,
) {
  const role = normalizeRole(body.role ?? 'student');
  const name = normalizeText(body.name ?? body.fullName ?? '');
  const birthday = normalizeText(body.birthday ?? '');
  const gender = normalizeText(body.gender ?? '');
  const email = normalizeEmail(body.email ?? '');
  const idNumber = normalizeText(body.idNumber ?? body.userId ?? '');
  const department = normalizeText(body.department ?? body.programDepartment ?? '');

  if (!name || !birthday || !gender || !email || !idNumber) {
    return { error: 'Please complete all required portal fields.', status: 400 };
  }

  if (role !== 'student' && role !== 'personnel' && role !== 'doctor') {
    return { error: 'Invalid portal role.', status: 400 };
  }

  if (role === 'doctor') {
    return { error: 'Doctor portal accounts cannot be created publicly.', status: 403 };
  }

  const existingId = await supabase.from('profiles').select('id').eq('id_number', idNumber).maybeSingle();
  if (existingId.error) {
    return { error: existingId.error.message || 'Unable to validate the portal ID.', status: 500 };
  }
  if (existingId.data) {
    return { error: 'A portal account already uses this ID.', status: 409 };
  }

  const profilePayload = {
    full_name: name,
    email,
    id_number: idNumber,
    role,
    birthday,
    gender,
    program: role === 'student' ? department : null,
    department_office: role === 'personnel' ? department : null,
    profile_complete: false,
    member_since: new Date().toISOString(),
  };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert(profilePayload)
    .select('*')
    .single();

  if (profileError || !profile) {
    return { error: profileError?.message || 'Unable to create the portal account.', status: 500 };
  }

  let qrPayload: string | null = null;
  if (role === 'student' || role === 'personnel') {
    const token = crypto.randomUUID();
    const { error: tokenError } = await supabase.from('qr_tokens').insert({
      token,
      profile_id: profile.id,
      is_active: true,
      issued_at: new Date().toISOString(),
    });

    if (!tokenError) {
      qrPayload = `medipoint:v2:${token}`;
    }
  }

  return { user: mapProfileToPortalUser(profile as Record<string, unknown>), qrPayload };
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

  const action = normalizeText(body.action ?? '').toLowerCase();

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server configuration error.';
    return jsonResponse({ error: message }, 500);
  }

  if (action === 'signup') {
    const result = await signupPortal(supabase, body);
    if ('error' in result && result.error) {
      return jsonResponse({ error: result.error }, result.status);
    }
    return jsonResponse({ ok: true, user: result.user, qrPayload: result.qrPayload });
  }

  const result = await loginPortal(supabase, body);
  if ('error' in result && result.error) {
    return jsonResponse({ error: result.error }, result.status);
  }

  return jsonResponse({ ok: true, user: result.user });
});
