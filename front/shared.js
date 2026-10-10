(function () {
  'use strict';

  const SESSION_KEY = 'medipointSession';
  const PORTAL_ACCOUNT_PREFIX = 'portalAccount_';
  const PORTAL_PROFILE_PREFIX = 'portalProfile_';
  const CLINICAL_ACCOUNT = Object.freeze({
    name: 'MediPoint Doctor',
    idNumber: 'MP-DOC-2026',
    email: 'doctor@medipoint.local',
    role: 'doctor'
  });

  function parseJSON(value, fallback) {
    if(value === null || value === undefined || value === '') return fallback;

    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn('Ignored invalid stored MediPoint data.', error);
      return fallback;
    }
  }

  function readJSON(storage, key, fallback) {
    return parseJSON(storage.getItem(key), fallback);
  }

  function normalizeId(value) {
    return String(value || '').trim();
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizeId(value));
  }

  function getPublicIdNumber(user) {
    if (!user) return '';

    const candidates = [user.idNumber, user.studentNumber, user.id];
    for (const candidate of candidates) {
      const value = normalizeId(candidate);
      if (value && !isUuid(value)) {
        return value;
      }
    }

    return normalizeId(user.idNumber || user.studentNumber || '');
  }

  function getProfileId(user) {
    if (!user) return '';

    if (isUuid(user.profileId)) {
      return normalizeId(user.profileId);
    }

    if (isUuid(user.id)) {
      return normalizeId(user.id);
    }

    return normalizeId(user.profileId || '');
  }

  async function repairUserIdentity(user) {
    if (!user) return user;

    const publicId = getPublicIdNumber(user);
    if (publicId) {
      const repaired = {
        ...user,
        idNumber: publicId,
        profileId: getProfileId(user) || user.profileId || ''
      };

      if (repaired.idNumber !== user.idNumber) {
        saveUser(repaired);
        setCurrentUser(repaired);
      }

      return repaired;
    }

    const profileId = getProfileId(user);
    if (!profileId || !window.MEDIPOINT_SUPABASE_URL || !window.MEDIPOINT_SUPABASE_ANON_KEY) {
      return user;
    }

    try {
      const response = await fetch(`${window.MEDIPOINT_SUPABASE_URL}/functions/v1/data-retrieval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${window.MEDIPOINT_SUPABASE_ANON_KEY}`,
          apikey: window.MEDIPOINT_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          action: 'profile',
          profileId
        })
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data.user && data.user.idNumber && !isUuid(data.user.idNumber)) {
        const repaired = {
          ...user,
          ...data.user,
          id: data.user.id,
          profileId: data.user.id,
          idNumber: data.user.idNumber
        };
        saveUser(repaired);
        setCurrentUser(repaired);
        return repaired;
      }
    } catch (error) {
      console.warn('Unable to repair stored user identity.', error);
    }

    return user;
  }

  function userKey(id) {
    return `user_${normalizeId(id)}`;
  }

  function measurementsKey(id) {
    return `measurements_${normalizeId(id)}`;
  }

  function latestAssessmentKey(id) {
    return `latestAssessment_${normalizeId(id)}`;
  }

  function setCurrentUser(user) {
    if(!user) return;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    localStorage.removeItem('currentUser');
  }

  function getCurrentUser() {
    const sessionUser = readJSON(sessionStorage, SESSION_KEY, null);
    if(sessionUser) return sessionUser;

    // One-time compatibility migration from the original persistent session.
    const legacyUser = readJSON(localStorage, 'currentUser', null);
    if(legacyUser) {
      setCurrentUser(legacyUser);
      return legacyUser;
    }

    return null;
  }

  function clearCurrentUser() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('currentUser');
  }

  function getUser(id) {
    return readJSON(localStorage, userKey(id), null);
  }

  function getUsers() {
    const users = [];

    for(let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if(!key || !key.startsWith('user_')) continue;

      const user = readJSON(localStorage, key, null);
      if(user && normalizeId(user.idNumber || user.id || user.studentNumber)) {
        users.push(user);
      }
    }

    return users;
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  function portalAccountKey(email) {
    return `${PORTAL_ACCOUNT_PREFIX}${normalizeEmail(email)}`;
  }

  function portalProfileKey(id) {
    return `${PORTAL_PROFILE_PREFIX}${normalizeId(id)}`;
  }

  function getPortalProfile(id) {
    return readJSON(localStorage, portalProfileKey(id), null);
  }

  function getPortalAccount(email) {
    return readJSON(localStorage, portalAccountKey(email), null);
  }

  function getPortalAccounts() {
    const accounts = [];
    for(let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if(!key || !key.startsWith(PORTAL_ACCOUNT_PREFIX)) continue;
      const account = readJSON(localStorage, key, null);
      if(account && account.email) accounts.push(account);
    }
    return accounts;
  }

  async function hashPassword(password) {
    const data = new TextEncoder().encode(String(password || ''));
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function savePortalAccount(profile) {
    if(profile && profile.role === 'doctor') {
      throw new Error('Doctor accounts must be provisioned by MediPoint administration.');
    }
    const email = normalizeEmail(profile && profile.email);
    if(!email) throw new Error('An email address is required.');
    const account = {
      email,
      userId: normalizeId(profile.idNumber),
      role: profile.role,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(portalAccountKey(email), JSON.stringify(account));
    localStorage.setItem(portalProfileKey(account.userId), JSON.stringify({
      ...profile,
      email,
      idNumber: account.userId,
      accountType: 'portal'
    }));
    return account;
  }

  function ensureClinicalAccount() {
    const email = normalizeEmail(CLINICAL_ACCOUNT.email);
    const account = {
      email,
      userId: CLINICAL_ACCOUNT.idNumber,
      role: 'doctor',
      managed: true,
      createdAt: '2026-01-01T00:00:00.000Z'
    };
    localStorage.setItem(portalAccountKey(email), JSON.stringify(account));
    localStorage.setItem(portalProfileKey(account.userId), JSON.stringify({
      ...CLINICAL_ACCOUNT,
      departmentOffice: 'University Clinic',
      profileComplete: true,
      accountType: 'portal',
      managedAccount: true,
      memberSince: account.createdAt
    }));
  }

  function authenticatePortalIdentity(name, idNumber) {
    const normalizedName = String(name || '').trim().toLowerCase();
    const normalizedId = normalizeId(idNumber);
    const account = getPortalAccounts().find(item => item.userId === normalizedId);

    if (account) {
      const user = getPortalProfile(account.userId);
      if (user && String(user.name || '').trim().toLowerCase() === normalizedName) {
        return user;
      }
    }

    const kioskUser = getUser(normalizedId);
    if (kioskUser && String(kioskUser.name || '').trim().toLowerCase() === normalizedName) {
      const role = String(kioskUser.role || '').toLowerCase();
      if (role === 'doctor' && !kioskUser.managedAccount) {
        return null;
      }
      return {
        ...kioskUser,
        accountType: kioskUser.accountType || 'kiosk'
      };
    }

    return null;
  }

  function saveUser(user, previousId) {
    const idNumber = getPublicIdNumber(user);
    if (!idNumber) throw new Error('A user ID is required.');

    const profileId = getProfileId(user);
    const storedUser = {
      ...user,
      idNumber,
      profileId: profileId || user.profileId || '',
      id: profileId || user.id || idNumber
    };

    const isPortalProfile = user && user.accountType === 'portal';
    const destinationKey = isPortalProfile ? portalProfileKey(idNumber) : userKey(idNumber);
    localStorage.setItem(destinationKey, JSON.stringify(storedUser));

    const oldId = normalizeId(previousId);
    if(oldId && oldId !== idNumber) {
      const oldMeasurements = getMeasurements(oldId);
      const newMeasurements = getMeasurements(idNumber);
      const oldLatest = readJSON(localStorage, latestAssessmentKey(oldId), null);
      const merged = [...oldMeasurements, ...newMeasurements]
        .filter((record, index, records) => records.findIndex(item => item.date === record.date) === index)
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

      if(merged.length) localStorage.setItem(measurementsKey(idNumber), JSON.stringify(merged));
      if(oldLatest) {
        localStorage.setItem(latestAssessmentKey(idNumber), JSON.stringify({
          ...oldLatest,
          userId: idNumber,
          user: user.name || oldLatest.user
        }));
      }
      localStorage.removeItem(measurementsKey(oldId));
      localStorage.removeItem(latestAssessmentKey(oldId));
      localStorage.removeItem(isPortalProfile ? portalProfileKey(oldId) : userKey(oldId));
    }
  }

  function getMeasurements(id) {
    const records = readJSON(localStorage, measurementsKey(id), []);
    return Array.isArray(records) ? records : [];
  }

  function saveAssessment(user, assessment) {
    const id = getPublicIdNumber(user);
    if(!id) throw new Error('Sign in before saving an assessment.');

    const rawResults = Array.isArray(assessment.results) ? assessment.results : [];
    const caremate = assessment.caremate || null;
    const results = window.MediPointCareMate
      ? window.MediPointCareMate.stripCareMateResults(rawResults)
      : rawResults;

    const record = {
      userId: id,
      user: user.name || 'Unknown User',
      program: user.program || user.departmentOffice || 'Not specified',
      date: assessment.date || new Date().toISOString(),
      results,
      caremate
    };

    const records = getMeasurements(id).filter(item => item.date !== record.date);
    records.unshift({ date: record.date, results: record.results });
    localStorage.setItem(measurementsKey(id), JSON.stringify(records));
    localStorage.setItem(latestAssessmentKey(id), JSON.stringify(record));
    localStorage.removeItem('latestAssessment');
    return record;
  }

  function getLatestAssessment(user) {
    if(!user) return null;
    const id = getPublicIdNumber(user);
    if(!id) return null;

    const current = readJSON(localStorage, latestAssessmentKey(id), null);
    if(current) return current;

    // Migrate legacy data only when its identity matches the signed-in user.
    const legacy = readJSON(localStorage, 'latestAssessment', null);
    if(legacy && legacy.userId === id) {
      return saveAssessment(user, legacy);
    }

    return null;
  }

  function escapeHTML(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function routeFor(user, base) {
    const prefix = base || '';
    const role = String(user && user.role || '').toLowerCase();
    return role === 'doctor'
      ? `${prefix}system/doctor-portal.html`
      : `${prefix}system/portal.html`;
  }

  async function fetchAssessmentsFromDatabase(user) {
    if (!window.MEDIPOINT_SUPABASE_URL || !window.MEDIPOINT_SUPABASE_ANON_KEY) {
      return null;
    }

    const idNumber = getPublicIdNumber(user);
    const profileId = getProfileId(user);
    if (!idNumber && !profileId) {
      return [];
    }

    try {
      const response = await fetch(`${window.MEDIPOINT_SUPABASE_URL}/functions/v1/data-retrieval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${window.MEDIPOINT_SUPABASE_ANON_KEY}`,
          apikey: window.MEDIPOINT_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          action: 'profile',
          idNumber,
          profileId,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data && Array.isArray(data.assessments)) {
        return data.assessments;
      }

      console.warn(
        'Unable to load assessments from Supabase.',
        data.error || `HTTP ${response.status}`,
      );
    } catch (error) {
      console.warn('Unable to load assessments from Supabase.', error);
    }

    return [];
  }

  window.MediPoint = {
    parseJSON,
    readJSON,
    normalizeId,
    isUuid,
    getPublicIdNumber,
    getProfileId,
    repairUserIdentity,
    userKey,
    measurementsKey,
    latestAssessmentKey,
    setCurrentUser,
    getCurrentUser,
    clearCurrentUser,
    getUser,
    getUsers,
    normalizeEmail,
    getPortalAccount,
    getPortalProfile,
    getPortalAccounts,
    savePortalAccount,
    ensureClinicalAccount,
    authenticatePortalIdentity,
    saveUser,
    getMeasurements,
    fetchAssessmentsFromDatabase,
    saveAssessment,
    getLatestAssessment,
    escapeHTML,
    routeFor
  };
})();
