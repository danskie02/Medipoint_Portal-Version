export async function hashPassword(password) {
  const data = new TextEncoder().encode(String(password ?? ''));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function newPasswordError(password, idNumber) {
  const value = String(password ?? '');
  if (value.length < 8) {
    return 'Use at least 8 characters for your new password.';
  }
  if (value.trim() === String(idNumber ?? '').trim()) {
    return 'Choose a password that is different from your ID number.';
  }
  return '';
}

export async function passwordMatches(profile, password) {
  const secret = String(password ?? '');
  if (!secret) return false;
  if (profile.password_hash) {
    return (await hashPassword(secret)) === profile.password_hash;
  }
  return secret === String(profile.id_number ?? '').trim();
}

export function mustChangePassword(profile) {
  return profile.must_change_password === true || !profile.password_hash;
}

export async function findProfilesByName(supabase, name) {
  const normalized = String(name || '').trim().toLowerCase();
  if (!normalized) return { profiles: [] };

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('full_name', String(name).trim());

  if (error) {
    return { error: error.message || 'Unable to look up the account.', status: 500 };
  }

  const profiles = (data || []).filter(
    (profile) => String(profile.full_name || '').trim().toLowerCase() === normalized,
  );
  return { profiles };
}

export async function matchProfileByPassword(profiles, password) {
  const matches = [];
  for (const profile of profiles) {
    if (await passwordMatches(profile, password)) {
      matches.push(profile);
    }
  }
  return matches;
}

export async function savePassword(supabase, profileId, password) {
  const passwordHash = await hashPassword(password);
  const { data, error } = await supabase
    .from('profiles')
    .update({
      password_hash: passwordHash,
      must_change_password: false,
    })
    .eq('id', profileId)
    .select('*')
    .single();

  if (error || !data) {
    return { error: error?.message || 'Unable to save the new password.', status: 500 };
  }

  return { profile: data };
}
