/**
 * MediPoint portal auth (Supabase Edge Function)
 *
 * Portal login, sign-up, required password change, and forgotten-password reset
 * via email OTP (SendGrid). New accounts keep the ID number as a temporary
 * password until it is replaced.
 */

import { corsHeaders, jsonResponse } from '../_shared/cors.js';
import { createAdminClient } from '../_shared/supabase-admin.js';
import { mapProfileRowToUser, normalizeRole, normalizeText } from '../_shared/profile-mapper.js';
import {
  findProfilesByName,
  hashPassword,
  matchProfileByPassword,
  mustChangePassword,
  newPasswordError,
  savePassword,
} from '../_shared/password.js';
import { sendSendgridEmail } from '../_shared/sendgrid.js';
import { buildPasswordResetEmail } from '../_shared/email-templates.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function normalizeName(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function mapProfileToPortalUser(profile: Record<string, unknown>, changeRequired?: boolean) {
  const user = mapProfileRowToUser(profile, 'portal');
  if (typeof changeRequired === 'boolean') {
    user.mustChangePassword = changeRequired;
  }
  return user;
}

async function loginPortal(
  supabase: ReturnType<typeof createAdminClient>,
  body: Record<string, unknown>,
) {
  const name = normalizeText(body.name ?? body.fullName ?? '');
  const password = normalizeText(body.password ?? body.idNumber ?? body.studentNumber ?? '');

  if (!name || !password) {
    return { error: 'Please enter your full name and password.', status: 400 };
  }

  const lookedUp = await findProfilesByName(supabase, name);
  if ('error' in lookedUp && lookedUp.error) {
    return { error: lookedUp.error, status: lookedUp.status };
  }

  const requestedRole = normalizeText(body.role ?? '').toLowerCase();
  const candidates = (lookedUp.profiles || []).filter((profile) => {
    if (!requestedRole) return true;
    return String(profile.role || '').toLowerCase() === requestedRole;
  });

  const matches = await matchProfileByPassword(candidates, password);
  if (matches.length !== 1) {
    return { error: 'Full name or password is incorrect.', status: 401 };
  }

  const profile = matches[0] as Record<string, unknown>;
  const changeRequired = mustChangePassword(profile);
  return {
    user: mapProfileToPortalUser(profile, changeRequired),
    mustChangePassword: changeRequired,
  };
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
    password_hash: await hashPassword(idNumber),
    must_change_password: true,
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

  return {
    user: mapProfileToPortalUser(profile as Record<string, unknown>, true),
    qrPayload,
    mustChangePassword: true,
  };
}

async function changePassword(
  supabase: ReturnType<typeof createAdminClient>,
  body: Record<string, unknown>,
) {
  const name = normalizeText(body.name ?? body.fullName ?? '');
  const currentPassword = normalizeText(body.currentPassword ?? body.password ?? '');
  const newPassword = String(body.newPassword ?? '');

  if (!name || !currentPassword || !newPassword) {
    return { error: 'Enter your current password and a new password.', status: 400 };
  }

  const lookedUp = await findProfilesByName(supabase, name);
  if ('error' in lookedUp && lookedUp.error) {
    return { error: lookedUp.error, status: lookedUp.status };
  }

  const matches = await matchProfileByPassword(lookedUp.profiles || [], currentPassword);
  if (matches.length !== 1) {
    return { error: 'Current password is incorrect.', status: 401 };
  }

  const profile = matches[0];
  const ruleError = newPasswordError(newPassword, profile.id_number);
  if (ruleError) {
    return { error: ruleError, status: 400 };
  }

  const saved = await savePassword(supabase, profile.id, newPassword);
  if ('error' in saved && saved.error) {
    return { error: saved.error, status: saved.status };
  }

  return {
    user: mapProfileToPortalUser(saved.profile as Record<string, unknown>, false),
    mustChangePassword: false,
  };
}

function createOtpCode() {
  return String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
}

async function findProfileByIdentity(
  supabase: ReturnType<typeof createAdminClient>,
  name: string,
  idNumber: string,
  email: string,
) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id_number', idNumber)
    .maybeSingle();

  const identityMatches = profile
    && normalizeName(profile.full_name) === normalizeName(name)
    && normalizeEmail(profile.email) === email;

  if (error || !identityMatches) {
    return { error: 'Those account details do not match our records.', status: 401 };
  }

  return { profile: profile as Record<string, unknown> };
}

async function requestForgotPasswordOtp(
  supabase: ReturnType<typeof createAdminClient>,
  body: Record<string, unknown>,
) {
  const name = normalizeText(body.name ?? body.fullName ?? '');
  const idNumber = normalizeText(body.idNumber ?? body.userId ?? '');
  const email = normalizeEmail(body.email ?? '');

  if (!name || !idNumber || !email) {
    return { error: 'Enter your full name, ID number, and email.', status: 400 };
  }

  const matched = await findProfileByIdentity(supabase, name, idNumber, email);
  if ('error' in matched && matched.error) {
    return { error: matched.error, status: matched.status };
  }

  const profile = matched.profile;
  const code = createOtpCode();
  const codeHash = await hashPassword(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  await supabase
    .from('password_reset_otps')
    .update({ consumed_at: new Date().toISOString() })
    .eq('profile_id', profile.id)
    .is('consumed_at', null);

  const { error: insertError } = await supabase.from('password_reset_otps').insert({
    profile_id: profile.id,
    code_hash: codeHash,
    expires_at: expiresAt,
    attempts: 0,
  });

  if (insertError) {
    return {
      error: insertError.message || 'Unable to create a verification code.',
      status: 500,
    };
  }

  try {
    const mail = buildPasswordResetEmail({
      fullName: normalizeText(profile.full_name),
      code,
    });
    await sendSendgridEmail({
      to: email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send the verification email.';
    return { error: message, status: 502 };
  }

  return {
    otpSent: true,
    message: 'A verification code was sent to your email.',
  };
}

async function confirmForgotPasswordWithOtp(
  supabase: ReturnType<typeof createAdminClient>,
  body: Record<string, unknown>,
) {
  const name = normalizeText(body.name ?? body.fullName ?? '');
  const idNumber = normalizeText(body.idNumber ?? body.userId ?? '');
  const email = normalizeEmail(body.email ?? '');
  const code = normalizeText(body.code ?? body.otp ?? '');
  const newPassword = String(body.newPassword ?? '');

  if (!name || !idNumber || !email || !code || !newPassword) {
    return {
      error: 'Enter your account details, the email code, and a new password.',
      status: 400,
    };
  }

  const ruleError = newPasswordError(newPassword, idNumber);
  if (ruleError) {
    return { error: ruleError, status: 400 };
  }

  const matched = await findProfileByIdentity(supabase, name, idNumber, email);
  if ('error' in matched && matched.error) {
    return { error: matched.error, status: matched.status };
  }

  const profile = matched.profile;
  const { data: otpRows, error: otpError } = await supabase
    .from('password_reset_otps')
    .select('*')
    .eq('profile_id', profile.id)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1);

  if (otpError) {
    return { error: otpError.message || 'Unable to verify the code.', status: 500 };
  }

  const otp = Array.isArray(otpRows) ? otpRows[0] : null;
  if (!otp) {
    return { error: 'Request a new verification code first.', status: 400 };
  }

  if (new Date(otp.expires_at).getTime() < Date.now()) {
    await supabase
      .from('password_reset_otps')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', otp.id);
    return { error: 'That verification code has expired. Request a new one.', status: 400 };
  }

  if (Number(otp.attempts || 0) >= OTP_MAX_ATTEMPTS) {
    await supabase
      .from('password_reset_otps')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', otp.id);
    return { error: 'Too many incorrect attempts. Request a new code.', status: 429 };
  }

  const codeHash = await hashPassword(code);
  if (codeHash !== otp.code_hash) {
    await supabase
      .from('password_reset_otps')
      .update({ attempts: Number(otp.attempts || 0) + 1 })
      .eq('id', otp.id);
    return { error: 'That verification code is incorrect.', status: 401 };
  }

  const saved = await savePassword(supabase, profile.id, newPassword);
  if ('error' in saved && saved.error) {
    return { error: saved.error, status: saved.status };
  }

  await supabase
    .from('password_reset_otps')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', otp.id);

  return {
    user: mapProfileToPortalUser(saved.profile as Record<string, unknown>, false),
    mustChangePassword: false,
    passwordUpdated: true,
  };
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

  const handlers: Record<string, (client: ReturnType<typeof createAdminClient>, payload: Record<string, unknown>) => Promise<Record<string, unknown>>> = {
    signup: signupPortal,
    'change-password': changePassword,
    'forgot-password-request': requestForgotPasswordOtp,
    'forgot-password-confirm': confirmForgotPasswordWithOtp,
    'forgot-password': requestForgotPasswordOtp,
    login: loginPortal,
  };

  const handler = handlers[action] || loginPortal;
  const result = await handler(supabase, body);
  if ('error' in result && result.error) {
    return jsonResponse({ error: result.error }, result.status as number);
  }

  return jsonResponse({
    ok: true,
    user: result.user,
    mustChangePassword: Boolean(result.mustChangePassword),
    passwordUpdated: Boolean(result.passwordUpdated) || action === 'change-password' || action === 'forgot-password-confirm',
    otpSent: Boolean(result.otpSent),
    message: result.message,
    qrPayload: 'qrPayload' in result ? result.qrPayload : undefined,
  });
});
