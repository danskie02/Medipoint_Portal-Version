/**
 * Thin vanilla JS client for MediPoint kiosk Edge Functions.
 * Set window.MEDIPOINT_SUPABASE_URL before loading this script.
 */
(function () {
  'use strict';

  const DEFAULT_FUNCTION = 'kiosk-qr-login';

  function getSupabaseUrl() {
    return String(window.MEDIPOINT_SUPABASE_URL || '').replace(/\/$/, '');
  }

  function getAnonKey() {
    return String(window.MEDIPOINT_SUPABASE_ANON_KEY || '');
  }

  async function callEdgeFunction(functionName, payload, options) {
    const baseUrl = getSupabaseUrl();
    const anonKey = getAnonKey();

    if (!baseUrl || !anonKey) {
      throw new Error('Supabase URL or anon key is not configured.');
    }

    const response = await fetch(`${baseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
        ...(options && options.kioskId ? { 'x-kiosk-id': options.kioskId } : {}),
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data.error || data.message || 'Kiosk login request failed.';
      throw new Error(message);
    }

    return data;
  }

  async function loginWithQrCode(qrPayload, options) {
    const payload = {
      qrPayload,
      requestedRole: options && options.requestedRole ? options.requestedRole : '',
      kioskId: options && options.kioskId ? options.kioskId : '',
    };

    return callEdgeFunction(DEFAULT_FUNCTION, payload, options);
  }

  async function loginWithId(fullName, options) {
    const payload = {
      fullName,
      idNumber: options && options.idNumber ? options.idNumber : '',
      requestedRole: options && options.requestedRole ? options.requestedRole : '',
      kioskId: options && options.kioskId ? options.kioskId : '',
    };

    return callEdgeFunction('kiosk-id-login', payload, options);
  }

  async function signUpKioskProfile(profile, options) {
    const payload = {
      fullName: profile && profile.fullName ? profile.fullName : profile && profile.name ? profile.name : '',
      birthday: profile && profile.birthday ? profile.birthday : '',
      gender: profile && profile.gender ? profile.gender : '',
      email: profile && profile.email ? profile.email : '',
      userId: profile && profile.userId ? profile.userId : profile && profile.idNumber ? profile.idNumber : '',
      programDepartment: profile && profile.programDepartment ? profile.programDepartment : profile && profile.departmentOffice ? profile.departmentOffice : '',
      role: profile && profile.role ? profile.role : '',
      kioskId: options && options.kioskId ? options.kioskId : '',
    };

    return callEdgeFunction('kiosk-signup', payload, options);
  }

  async function portalAuth(action, payload, options) {
    return callEdgeFunction('portal-auth', {
      action,
      ...payload,
      kioskId: options && options.kioskId ? options.kioskId : '',
    }, options);
  }

  async function retrieveData(payload, options) {
    return callEdgeFunction('data-retrieval', {
      ...payload,
      kioskId: options && options.kioskId ? options.kioskId : '',
    }, options);
  }

  async function storeAssessment(payload, options) {
    return callEdgeFunction('store-assessment', {
      ...payload,
      kioskId: options && options.kioskId ? options.kioskId : '',
    }, options);
  }

  async function updateProfile(profile, options) {
    return callEdgeFunction('update-profile', {
      profileId: profile?.profileId ?? profile?.id ?? '',
      idNumber: profile?.idNumber ?? profile?.studentNumber ?? '',
      name: profile?.name ?? '',
      email: profile?.email ?? '',
      role: profile?.role ?? '',
      birthday: profile?.birthday ?? '',
      gender: profile?.gender ?? '',
      phone: profile?.phone ?? '',
      emergencyContact: profile?.emergencyContact ?? '',
      emergencyPhone: profile?.emergencyPhone ?? '',
      department: profile?.program ?? profile?.departmentOffice ?? profile?.department ?? '',
      barangay: profile?.barangay ?? '',
      city: profile?.city ?? '',
      province: profile?.province ?? '',
      presentBarangay: profile?.presentBarangay ?? '',
      presentCity: profile?.presentCity ?? '',
      presentProvince: profile?.presentProvince ?? '',
      guardianRelationship: profile?.guardianRelationship ?? '',
      medicalHistory: Array.isArray(profile?.medicalHistory) ? profile.medicalHistory : [],
      otherMedicalHistory: profile?.otherMedicalHistory ?? '',
      previousSurgeries: profile?.previousSurgeries ?? '',
      previousSurgeryDate: profile?.previousSurgeryDate ?? '',
      currentMedications: profile?.currentMedications ?? '',
      knownAllergies: profile?.knownAllergies ?? '',
      kioskId: options?.kioskId ?? '',
    }, options);
  }

  window.MediPointKioskApi = {
    loginWithQrCode,
    loginWithId,
    signUpKioskProfile,
    portalAuth,
    retrieveData,
    storeAssessment,
    updateProfile,
    callEdgeFunction,
  };
})();
