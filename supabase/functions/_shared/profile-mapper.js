export function normalizeText(value) {
  return String(value || '').trim();
}

export function normalizeRole(value) {
  const role = normalizeText(value).toLowerCase();
  return role === 'doctor' ? 'doctor' : role === 'personnel' ? 'personnel' : 'student';
}

export function mapProfileRowToUser(profile, accountType = 'portal') {
  return {
    id: profile.id,
    profileId: profile.id,
    idNumber: profile.id_number,
    name: profile.full_name,
    email: profile.email || '',
    role: profile.role,
    birthday: profile.birthday || '',
    gender: profile.gender || '',
    program: profile.program || '',
    departmentOffice: profile.department_office || '',
    phone: profile.phone || '',
    emergencyContact: profile.emergency_contact_name || '',
    guardianRelationship: profile.emergency_contact_relationship || '',
    emergencyPhone: profile.emergency_phone || '',
    barangay: profile.barangay || '',
    city: profile.city || '',
    province: profile.province || '',
    presentBarangay: profile.present_barangay || '',
    presentCity: profile.present_city || '',
    presentProvince: profile.present_province || '',
    medicalHistory: Array.isArray(profile.medical_history) ? profile.medical_history : [],
    otherMedicalHistory: profile.other_medical_history || '',
    previousSurgeries: profile.previous_surgeries || '',
    previousSurgeryDate: profile.previous_surgery_date || '',
    currentMedications: profile.current_medications || '',
    knownAllergies: profile.known_allergies || '',
    profileComplete: Boolean(profile.profile_complete),
    managedAccount: Boolean(profile.managed_account),
    memberSince: profile.member_since,
    accountType,
  };
}

export function buildProfileUpdatePayload(body) {
  const role = normalizeRole(body.role ?? 'student');
  const department = normalizeText(body.department ?? body.program ?? body.departmentOffice ?? '');

  return {
    role,
    payload: {
      full_name: normalizeText(body.name ?? body.fullName ?? ''),
      email: normalizeText(body.email ?? '') || null,
      birthday: normalizeText(body.birthday ?? '') || null,
      gender: normalizeText(body.gender ?? '') || null,
      phone: normalizeText(body.phone ?? '') || null,
      emergency_contact_name: normalizeText(body.emergencyContact ?? body.emergency_contact_name ?? '') || null,
      emergency_contact_relationship: normalizeText(
        body.guardianRelationship ?? body.emergency_contact_relationship ?? '',
      ) || null,
      emergency_phone: normalizeText(body.emergencyPhone ?? body.emergency_phone ?? '') || null,
      barangay: normalizeText(body.barangay ?? '') || null,
      city: normalizeText(body.city ?? '') || null,
      province: normalizeText(body.province ?? '') || null,
      present_barangay: normalizeText(body.presentBarangay ?? '') || null,
      present_city: normalizeText(body.presentCity ?? '') || null,
      present_province: normalizeText(body.presentProvince ?? '') || null,
      medical_history: Array.isArray(body.medicalHistory) ? body.medicalHistory : [],
      other_medical_history: normalizeText(body.otherMedicalHistory ?? '') || null,
      previous_surgeries: normalizeText(body.previousSurgeries ?? '') || null,
      previous_surgery_date: normalizeText(body.previousSurgeryDate ?? '') || null,
      current_medications: normalizeText(body.currentMedications ?? '') || null,
      known_allergies: normalizeText(body.knownAllergies ?? '') || null,
      program: role === 'student' ? department || null : null,
      department_office: role === 'personnel' ? department || null : null,
      profile_complete: true,
    },
  };
}
