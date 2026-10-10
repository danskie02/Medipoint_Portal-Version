const userShort = document.getElementById('userShort');
const userInitials = document.getElementById('userInitials');
const sideRole = document.getElementById('sideRole');
const todayStamp = document.getElementById('todayStamp');
const welcomeName = document.getElementById('welcomeName');

const pName = document.getElementById('pName');
const pRole = document.getElementById('pRole');
const pId = document.getElementById('pId');
const pEmail = document.getElementById('pEmail');

// Profile page additions
const userInitialsLg = document.getElementById('userInitialsLg');
const pRolePill = document.getElementById('pRolePill');
const pIdMeta = document.getElementById('pIdMeta');
const pMemberSince = document.getElementById('pMemberSince');
const pDob = document.getElementById('pDob');
const pGender = document.getElementById('pGender');
const pBarangay = document.getElementById('pBarangay');
const pCity = document.getElementById('pCity');
const pProvince = document.getElementById('pProvince');
const pPhone = document.getElementById('pPhone');
const pEmergency = document.getElementById('pEmergency');
const pEmergencyPhone = document.getElementById('pEmergencyPhone');
const pDept = document.getElementById('pDept');
const pKiosk = document.getElementById('pKiosk');
const statLastCheckin = document.getElementById('statLastCheckin');
const statTotalAssessments = document.getElementById('statTotalAssessments');
const statLatestStatus = document.getElementById('statLatestStatus');
const editProfileBtn = document.getElementById('editProfileBtn');
const changePhotoBtn = document.getElementById('changePhotoBtn');
const reportIssueBtn = document.getElementById('reportIssueBtn');

const resultsGrid = document.getElementById('resultsGrid');
const historyList = document.getElementById('historyList');

const searchInput = document.getElementById('searchInput');
const exportBtn = document.getElementById('exportBtn');

const normalCount = document.getElementById('normalCount');
const warningCount = document.getElementById('warningCount');
const criticalCount = document.getElementById('criticalCount');
const allCount = document.getElementById('allCount');

const overallStatus = document.getElementById('overallStatus');
const overallText = document.getElementById('overallText');
const recommendationList = document.getElementById('recommendationList');
const heroStatus = document.getElementById('heroStatus');
const heroText = document.getElementById('heroText');
const userInfoForm = document.getElementById('userInfoForm');
const setupNotice = document.getElementById('setupNotice');

let activeFilter = 'All';

const currentUser = MediPoint.getCurrentUser();
const currentPage = window.location.pathname.split('/').pop() || 'portal.html';

if(!currentUser){
  window.location.replace('../login-pages/portal-auth.html');
}else if(currentUser.role === 'doctor'){
  window.location.replace('doctor-portal.html');
}

function isProfileReady(profile){
  if(!profile){
    return false;
  }

  const idValue = MediPoint.getPublicIdNumber(profile);

  return Boolean(
    profile.profileComplete &&
    profile.name &&
    profile.role &&
    idValue &&
    profile.email &&
    profile.phone &&
    profile.emergencyContact &&
    profile.emergencyPhone
  );
}

const defaultUser = {
  name: 'Guest User',
  role: 'Student',
  id: 'Not available',
  email: 'Not available'
};

let user = currentUser || defaultUser;
let userId = 'guest';

function renderUserDetails(){
  userId = MediPoint.getPublicIdNumber(user) || 'guest';

  setText(userShort, user.name || 'Guest User');
  setText(userInitials, getInitials(user.name || 'Guest User'));
  setText(sideRole, formatRole(user.role || 'student'));
  setText(welcomeName, user.name || 'Guest');
  setText(pName, user.name || 'Guest User');
  setText(pRole, formatRole(user.role || 'student'));
  setText(pId, userId);
  setText(pEmail, user.email || 'Not available');
  setText(todayStamp, new Date().toLocaleDateString('en-US', {
    month:'short',
    day:'numeric',
    year:'numeric'
  }));

  setText(userInitialsLg, getInitials(user.name || 'Guest User'));
  setText(pRolePill, formatRole(user.role || 'student'));
  setText(pIdMeta, userId && userId !== 'guest' ? `ID ${userId}` : 'ID not available');
  setText(pMemberSince, user.memberSince ? `Member since ${formatDate(user.memberSince)}` : 'Member since -');
  setText(pDob, user.birthday || user.dob || user.birthDate ? formatDate(user.birthday || user.dob || user.birthDate) : 'Not available');
  setText(pGender, user.gender || 'Not available');
  setText(pBarangay, user.barangay || 'Not available');
  setText(pCity, user.city || 'Not available');
  setText(pProvince, user.province || 'Not available');
  setText(pPhone, user.phone || user.mobile || 'Not available');
  setText(pEmergency, user.emergencyContact || user.emergencyContactName || 'Not available');
  setText(pEmergencyPhone, user.emergencyPhone || 'Not available');
  setText(pDept, user.program || user.departmentOffice || user.department || user.section || 'Not available');
  setText(pKiosk, user.kiosk || user.registeredKiosk || 'Not available');
}

async function bootstrapPortal(){
  user = await MediPoint.repairUserIdentity(currentUser || defaultUser);

  if(currentPage !== 'user-info.html' && !isProfileReady(user)){
    window.location.href = 'user-info.html';
    return;
  }

  renderUserDetails();

  if(userInfoForm){
    fillUserInfoForm();
  }

  activateCurrentNav();
  void renderCounts();
  void renderResults();
  void renderAssessment();
  void renderHistory();
  void renderProfileSnapshot();
}

function setText(element, value){
  if(element){
    element.textContent = value;
  }
}

function setHTML(element, value){
  if(element){
    element.innerHTML = value;
  }
}

function getInitials(name){
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'GU';
}

function normalizeRole(role){
  const value = String(role || 'student').toLowerCase();

  return value === 'personnel' ? 'personnel' : 'student';
}

function formatRole(role){
  return normalizeRole(role) === 'personnel' ? 'Personnel' : 'Student';
}

function formatDate(value){
  const date = new Date(value);

  if(isNaN(date.getTime())){
    return 'Not available';
  }

  return date.toLocaleDateString('en-US', {
    month:'long',
    day:'numeric',
    year:'numeric'
  });
}

async function getMeasurements(){
  const current = await MediPoint.repairUserIdentity(MediPoint.getCurrentUser());
  const idNumber = MediPoint.getPublicIdNumber(current);
  if(!current || !idNumber) {
    return [];
  }

  const remoteAssessments = await MediPoint.fetchAssessmentsFromDatabase(current);
  if (remoteAssessments !== null) {
    return remoteAssessments;
  }

  return MediPoint.getMeasurements(idNumber);
}

function normalizeStatus(status){
  const text = String(status || '').toLowerCase();

  if(text.includes('critical') || text.includes('high fever')){
    return 'Critical';
  }

  if(text.includes('warning') || text.includes('attention') || text.includes('elevated')){
    return 'Warning';
  }

  if(text.includes('normal')){
    return 'Normal';
  }

  if(text.includes('recorded')){
    return 'Recorded';
  }

  return 'Recorded';
}

function getDisplayStatus(status){
  const text = String(status || '').trim();
  return text || 'Recorded';
}

function getStatusClass(status){
  const normalized = normalizeStatus(status);
  if(normalized === 'Recorded') return 'recorded';
  return normalized.toLowerCase();
}

function splitWeightBmi(results){
  const separated = [];

  results.forEach(result => {
    const title = String(result.title || '').toLowerCase();
    const value = String(result.value || '');

    if(title.includes('weight') && title.includes('bmi')){
      const weightMatch = value.match(/([\d.]+)\s*kg/i);
      const bmiMatch = value.match(/bmi[:\s]*([\d.]+)/i);

      separated.push({
        title: 'Weight',
        value: weightMatch ? weightMatch[1] : value,
        unit: 'kg',
        status: result.status || 'Normal',
        note: 'Recorded body weight.'
      });

      separated.push({
        title: 'BMI',
        value: bmiMatch ? bmiMatch[1] : 'Not available',
        unit: '',
        status: result.status || 'Normal',
        note: 'Calculated body mass index.'
      });
    }else{
      separated.push(result);
    }
  });

  return separated;
}

async function getLatestAssessmentRecord(){
  const measurements = await getMeasurements();
  return measurements.length ? measurements[0] : null;
}

async function getLatestCaremate(){
  const latest = await getLatestAssessmentRecord();
  if(!latest){
    return null;
  }

  if(window.MediPointCareMate){
    return window.MediPointCareMate.extractCareMateFromAssessment(latest);
  }

  return latest.caremate || null;
}

async function getLatestResults(){
  const measurements = await getMeasurements();

  if(!measurements.length){
    return [];
  }

  const results = measurements[0].results || [];
  return window.MediPointCareMate
    ? window.MediPointCareMate.stripCareMateResults(splitWeightBmi(results))
    : splitWeightBmi(results);
}

async function renderResults(){
  if(!resultsGrid){
    return;
  }

  const searchValue = searchInput ? searchInput.value.toLowerCase() : '';
  const latestResults = await getLatestResults();

  const filteredResults = latestResults.filter(result => {
    const status = normalizeStatus(result.status);
    const matchesFilter = activeFilter === 'All' || status === activeFilter;
    const matchesSearch = String(result.title || '').toLowerCase().includes(searchValue);

    return matchesFilter && matchesSearch;
  });

  if(!filteredResults.length){
    resultsGrid.innerHTML = `<div class="empty">No results found.</div>`;
    return;
  }

  resultsGrid.innerHTML = filteredResults.map(result => {
    const statusClass = getStatusClass(result.status);
    const displayStatus = getDisplayStatus(result.status);

    return `
      <article class="result-card ${statusClass}">
        <div class="result-top">
          <h3>${MediPoint.escapeHTML(result.title)}</h3>
          <em>${MediPoint.escapeHTML(displayStatus)}</em>
        </div>

        <div class="result-value">
          <strong>${MediPoint.escapeHTML(result.value)}</strong>
          <span>${MediPoint.escapeHTML(result.unit || '')}</span>
        </div>

        <p>${MediPoint.escapeHTML(result.note || 'Measurement recorded successfully.')}</p>
      </article>
    `;
  }).join('');
}

async function renderCounts(){
  if(!normalCount && !warningCount && !criticalCount && !allCount){
    return;
  }

  const latestResults = await getLatestResults();

  let normal = 0;
  let warning = 0;
  let critical = 0;

  latestResults.forEach(result => {
    const status = normalizeStatus(result.status);

    if(status === 'Normal') normal++;
    if(status === 'Warning') warning++;
    if(status === 'Critical') critical++;
    if(status === 'Recorded') {
      // Neutral measurements are tracked separately from "Normal" vitals.
    }
  });

  setText(normalCount, normal);
  setText(warningCount, warning);
  setText(criticalCount, critical);
  setText(allCount, latestResults.length);
}

function setAssessmentState(status, text, variant){
  setText(overallStatus, status);
  setText(overallText, text);
  setText(heroStatus, status);
  setText(heroText, text);
}

async function renderAssessment(){
  if(!overallStatus && !heroStatus && !recommendationList){
    return;
  }

  const latestResults = await getLatestResults();
  const caremate = await getLatestCaremate();

  if(!latestResults.length){
    setAssessmentState('No Data', 'Complete kiosk measurements first.', '');
    setHTML(recommendationList, `<li>Complete your kiosk assessment to view recommendations.</li>`);
    return;
  }

  if(caremate && caremate.recommendation && window.MediPointCareMate){
    const copy = window.MediPointCareMate.getRecommendationCopy(caremate.recommendation);
    const bullets = window.MediPointCareMate.recommendationBullets(caremate.recommendation);
    const variant = copy.severity === 'critical'
      ? 'critical'
      : copy.severity === 'warning'
        ? 'warning'
        : 'normal';

    setAssessmentState(copy.label, copy.summary, variant);
    setHTML(recommendationList, bullets.map(item => `<li>${item}</li>`).join(''));
    return;
  }

  const hasCritical = latestResults.some(result => normalizeStatus(result.status) === 'Critical');
  const hasWarning = latestResults.some(result => normalizeStatus(result.status) === 'Warning');

  if(hasCritical){
    setAssessmentState('Needs Attention', 'Some results are outside the normal range.', 'critical');
    setHTML(recommendationList, `
      <li>Please consult clinic personnel for proper assessment.</li>
      <li>Rest for a few minutes and repeat measurement if needed.</li>
      <li>Keep monitoring your health records.</li>
    `);
    return;
  }

  if(hasWarning){
    setAssessmentState('Monitor', 'Some results need monitoring.', 'warning');
    setHTML(recommendationList, `
      <li>Repeat the measurement after resting.</li>
      <li>Drink water and avoid sudden movement.</li>
      <li>Visit the clinic if symptoms continue.</li>
    `);
    return;
  }

  setAssessmentState('Normal', 'Your latest vital signs are within normal range.', 'normal');
  setHTML(recommendationList, `
    <li>Stay active and exercise regularly.</li>
    <li>Drink enough water.</li>
    <li>Eat a balanced and nutritious diet.</li>
    <li>Get enough sleep and rest.</li>
  `);
}

async function renderHistory(){
  if(!historyList){
    return;
  }

  const measurements = await getMeasurements();

  if(!measurements.length){
    historyList.innerHTML = `<div class="empty">No history available.</div>`;
    return;
  }

  historyList.innerHTML = measurements.map((record, index) => {
    const date = new Date(record.date).toLocaleString('en-US', {
      month:'long',
      day:'numeric',
      year:'numeric',
      hour:'2-digit',
      minute:'2-digit'
    });

    const total = record.results ? record.results.length : 0;

    return `
      <div class="history-item">
        <div>
          <strong>Assessment ${index + 1}</strong>
          <br>
          <span>${date}</span>
        </div>
        <span>${total} results</span>
      </div>
    `;
  }).join('');
}

function computeOverallStatusLabel(latestResults){
  if(!latestResults.length){
    return 'No data yet';
  }

  const hasCritical = latestResults.some(result => normalizeStatus(result.status) === 'Critical');
  const hasWarning = latestResults.some(result => normalizeStatus(result.status) === 'Warning');

  if(hasCritical){
    return 'Needs Attention';
  }

  if(hasWarning){
    return 'Monitor';
  }

  return 'Normal';
}

async function renderProfileSnapshot(){
  if(!statLastCheckin && !statTotalAssessments && !statLatestStatus){
    return;
  }

  const measurements = await getMeasurements();
  const latestResults = await getLatestResults();

  if(!measurements.length){
    setText(statLastCheckin, 'No check-ins yet');
  }else{
    setText(statLastCheckin, new Date(measurements[0].date).toLocaleDateString('en-US', {
      month:'short',
      day:'numeric',
      year:'numeric'
    }));
  }

  setText(statTotalAssessments, measurements.length);
  setText(statLatestStatus, computeOverallStatusLabel(latestResults));
}

async function exportCSV(){
  const results = await getLatestResults();

  if(!results.length){
    alert('No results to export.');
    return;
  }

  function csvCell(value){
    let text = String(value ?? '');
    if(/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  }

  let csv = 'Title,Value,Unit,Status,Note\n';

  results.forEach(result => {
    csv += [result.title, result.value, result.unit || '', result.status, result.note || '']
      .map(csvCell)
      .join(',') + '\n';
  });

  const blob = new Blob([csv], { type:'text/csv' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'medipoint-results.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function activateCurrentNav(){
  document.querySelectorAll('.side-nav a').forEach(link => {
    const linkPage = link.getAttribute('href');

    if(linkPage === currentPage){
      link.classList.add('active');
      return;
    }

    link.classList.remove('active');
  });
}

function fillUserInfoForm(){
  if(!userInfoForm){
    return;
  }

  const fields = {
    setupName: user.name || '',
    setupRole: normalizeRole(user.role),
    setupRoleValue: normalizeRole(user.role),
    setupId: MediPoint.getPublicIdNumber(user) || '',
    setupEmail: user.email || '',
    setupBirthday: user.birthday || user.dob || user.birthDate || '',
    setupGender: user.gender || '',
    setupPhone: user.phone || user.mobile || '',
    setupEmergency: user.emergencyContact || user.emergencyContactName || '',
    setupEmergencyPhone: user.emergencyPhone || '',
    setupBarangay: user.barangay || '',
    setupCity: user.city || '',
    setupProvince: user.province || '',
    presentBarangay: user.presentBarangay || '',
    presentCity: user.presentCity || '',
    presentProvince: user.presentProvince || '',
    guardianRelationship: user.guardianRelationship || '',
    otherMedicalHistory: user.otherMedicalHistory || '',
    previousSurgeries: user.previousSurgeries || '',
    previousSurgeryDate: user.previousSurgeryDate || '',
    currentMedications: user.currentMedications || '',
    knownAllergies: user.knownAllergies || '',
    setupDepartment: user.program || user.departmentOffice || user.department || user.section || ''
  };

  Object.entries(fields).forEach(([id, value]) => {
    const field = document.getElementById(id);

    if(field){
      field.value = value;
    }
  });

  const selectedHistory = Array.isArray(user.medicalHistory) ? user.medicalHistory : [];
  userInfoForm.querySelectorAll('input[name="medicalHistory"]').forEach(field => {
    field.checked = selectedHistory.includes(field.value);
  });
}

function saveUserInfo(event){
  event.preventDefault();
  void submitUserInfo(event);
}

function mergeSavedProfile(localProfile, serverProfile) {
  if (!serverProfile) {
    return localProfile;
  }

  const merged = {
    ...localProfile,
    profileId: serverProfile.id || localProfile.profileId,
    id: serverProfile.id || localProfile.id,
    idNumber: serverProfile.idNumber || localProfile.idNumber,
    name: serverProfile.name || localProfile.name,
    email: serverProfile.email || localProfile.email,
    role: serverProfile.role || localProfile.role,
    birthday: serverProfile.birthday || localProfile.birthday,
    gender: serverProfile.gender || localProfile.gender,
    phone: serverProfile.phone || localProfile.phone,
    emergencyContact: serverProfile.emergencyContact || localProfile.emergencyContact,
    guardianRelationship: serverProfile.guardianRelationship || localProfile.guardianRelationship,
    emergencyPhone: serverProfile.emergencyPhone || localProfile.emergencyPhone,
    program: serverProfile.program || localProfile.program,
    departmentOffice: serverProfile.departmentOffice || localProfile.departmentOffice,
    profileComplete: serverProfile.profileComplete ?? localProfile.profileComplete,
    memberSince: serverProfile.memberSince || localProfile.memberSince
  };

  const detailFields = [
    'barangay',
    'city',
    'province',
    'presentBarangay',
    'presentCity',
    'presentProvince',
    'guardianRelationship',
    'otherMedicalHistory',
    'previousSurgeries',
    'previousSurgeryDate',
    'currentMedications',
    'knownAllergies'
  ];

  detailFields.forEach(field => {
    merged[field] = serverProfile[field] || localProfile[field] || '';
  });

  merged.medicalHistory = Array.isArray(serverProfile.medicalHistory) && serverProfile.medicalHistory.length
    ? serverProfile.medicalHistory
    : (Array.isArray(localProfile.medicalHistory) ? localProfile.medicalHistory : []);

  return merged;
}

async function submitUserInfo(event){
  event.preventDefault();

  const formData = new FormData(userInfoForm);
  const idNumber = String(formData.get('idNumber') || '').trim();
  const name = String(formData.get('name') || '').trim();
  const role = String(formData.get('role') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  const emergencyContact = String(formData.get('emergencyContact') || '').trim();
  const emergencyPhone = String(formData.get('emergencyPhone') || '').trim();

  if(!idNumber || !name || !role || !email || !phone || !emergencyContact || !emergencyPhone){
    setText(setupNotice, 'Please complete all required fields before continuing.');
    return;
  }

  const completedProfile = {
    ...user,
    idNumber,
    profileId: MediPoint.getProfileId(user) || user.profileId || user.id || '',
    name,
    role,
    email,
    birthday: String(formData.get('birthday') || '').trim(),
    gender: String(formData.get('gender') || '').trim(),
    phone,
    emergencyContact,
    emergencyPhone,
    barangay: String(formData.get('barangay') || '').trim(),
    city: String(formData.get('city') || '').trim(),
    province: String(formData.get('province') || '').trim(),
    presentBarangay: String(formData.get('presentBarangay') || '').trim(),
    presentCity: String(formData.get('presentCity') || '').trim(),
    presentProvince: String(formData.get('presentProvince') || '').trim(),
    guardianRelationship: String(formData.get('guardianRelationship') || '').trim(),
    medicalHistory: formData.getAll('medicalHistory').map(value => String(value)),
    otherMedicalHistory: String(formData.get('otherMedicalHistory') || '').trim(),
    previousSurgeries: String(formData.get('previousSurgeries') || '').trim(),
    previousSurgeryDate: String(formData.get('previousSurgeryDate') || '').trim(),
    currentMedications: String(formData.get('currentMedications') || '').trim(),
    knownAllergies: String(formData.get('knownAllergies') || '').trim(),
    program: role === 'student' ? String(formData.get('department') || '').trim() : '',
    departmentOffice: role !== 'student' ? String(formData.get('department') || '').trim() : '',
    profileComplete: true,
    memberSince: user.memberSince || new Date().toISOString()
  };

  const existingAccount = MediPoint.getUser(idNumber);
  if(existingAccount && idNumber !== userId){
    setText(setupNotice, 'That ID number is already registered to another account.');
    return;
  }

  setText(setupNotice, 'Saving your profile...');

  try {
    if(typeof window.MediPointKioskApi !== 'undefined' && window.MEDIPOINT_SUPABASE_URL && window.MEDIPOINT_SUPABASE_ANON_KEY) {
      const result = await window.MediPointKioskApi.updateProfile(completedProfile, {
        kioskId: window.MEDIPOINT_KIOSK_ID || ''
      });

      if(result && result.user) {
        Object.assign(
          completedProfile,
          mergeSavedProfile(completedProfile, result.user)
        );
      }
    }
  } catch (error) {
    setText(setupNotice, error && error.message ? error.message : 'Could not save your profile to the database.');
    return;
  }

  MediPoint.saveUser(completedProfile, userId);

  if(completedProfile.role !== 'doctor' && completedProfile.email) {
    try {
      await MediPoint.savePortalAccount(completedProfile);
    } catch (error) {
      console.warn('Could not sync portal account locally.', error);
    }
  }

  MediPoint.setCurrentUser(completedProfile);
  window.location.href = 'portal.html';
}

document.querySelectorAll('.status-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.status-card').forEach(item => {
      item.classList.remove('active');
    });

    card.classList.add('active');
    activeFilter = card.dataset.filter;
    void renderResults();
  });
});

if(searchInput){
  searchInput.addEventListener('input', () => { void renderResults(); });
}

if(exportBtn){
  exportBtn.addEventListener('click', () => { void exportCSV(); });
}

if(editProfileBtn){
  editProfileBtn.addEventListener('click', () => {
    window.location.href = 'user-info.html';
  });
}

if(changePhotoBtn){
  changePhotoBtn.addEventListener('click', () => {
    alert('Photo upload is not available yet.');
  });
}

if(reportIssueBtn){
  reportIssueBtn.addEventListener('click', () => {
    alert('Thanks for flagging this. Please describe the issue to clinic staff at the front desk.');
  });
}

if(userInfoForm){
  userInfoForm.addEventListener('submit', saveUserInfo);
}

document.querySelectorAll('#portalLogoutBtn').forEach(button => {
  button.addEventListener('click', () => {
    MediPoint.clearCurrentUser();
    window.location.href = '../login-pages/portal-auth.html';
  });
});

void bootstrapPortal();
