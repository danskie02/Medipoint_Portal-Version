const staffName = document.getElementById('staffName');
const staffRole = document.getElementById('staffRole');
const staffInitials = document.getElementById('staffInitials');
const todayStamp = document.getElementById('todayStamp');
const heroStatus = document.getElementById('heroStatus');
const heroText = document.getElementById('heroText');
const totalPatients = document.getElementById('totalPatients');
const monitorPatients = document.getElementById('monitorPatients');
const urgentPatients = document.getElementById('urgentPatients');
const normalPatients = document.getElementById('normalPatients');
const patientSearch = document.getElementById('patientSearch');
const patientList = document.getElementById('patientList');
const patientDetail = document.getElementById('patientDetail');
const filterButtons = document.querySelectorAll('.filter-btn');
const staffLogoutBtn = document.getElementById('staffLogoutBtn');

let activeFilter = 'All';
let searchValue = '';
let selectedPatientId = '';

const currentStaff = MediPoint.getCurrentUser();
if(!currentStaff){
  window.location.replace('../login-pages/portal-auth.html');
}else if(currentStaff.role === 'doctor' && !currentStaff.managedAccount){
  MediPoint.clearCurrentUser();
  window.location.replace('../login-pages/portal-auth.html');
}else if(currentStaff.role !== 'doctor'){
  window.location.replace('portal.html');
}

function setText(element, value) {
  if(element){
    element.textContent = value;
  }
}

function getInitials(name) {
  return String(name || 'Clinical Staff')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'CS';
}

function formatRole(role) {
  const value = String(role || 'doctor').toLowerCase();
  return value === 'student' ? 'Student' : 'Doctor / Clinical Staff';
}

function normalizeStatus(status) {
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

function splitWeightBmi(results) {
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

async function fetchDoctorProfiles() {
  if(!window.MEDIPOINT_SUPABASE_URL || !window.MEDIPOINT_SUPABASE_ANON_KEY) {
    return MediPoint.getUsers().filter(profile => profile.role === 'student' || profile.role === 'personnel');
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
        action: 'doctor-list',
        role: 'student',
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data || !Array.isArray(data.profiles)) {
      throw new Error(data.error || 'Unable to load doctor data.');
    }

    return data.profiles.filter(profile => profile.role === 'student' || profile.role === 'personnel');
  } catch (error) {
    console.warn('Unable to refresh doctor portal profiles from Supabase.', error);
    return MediPoint.getUsers().filter(profile => profile.role === 'student' || profile.role === 'personnel');
  }
}

function getUserProfiles() {
  return MediPoint.getUsers().filter(profile => profile.role === 'student' || profile.role === 'personnel');
}

async function getMeasurementsFor(profile) {
  const userId = MediPoint.getPublicIdNumber(profile) || profile.email || 'guest';
  const remoteAssessments = await MediPoint.fetchAssessmentsFromDatabase(profile);
  if (remoteAssessments !== null) {
    return remoteAssessments;
  }

  return MediPoint.getMeasurements(userId);
}

async function getLatestResults(profile) {
  const measurements = await getMeasurementsFor(profile);
  const latest = measurements[0] || { results: [] };
  const results = latest.results || [];
  const stripped = window.MediPointCareMate
    ? window.MediPointCareMate.stripCareMateResults(results)
    : results;
  return splitWeightBmi(stripped);
}

function getLatestCaremate(profile, measurements) {
  const latest = measurements && measurements[0] ? measurements[0] : null;
  if (!latest) return null;

  if (window.MediPointCareMate) {
    return window.MediPointCareMate.extractCareMateFromAssessment(latest);
  }

  return latest.caremate || null;
}

function getCaremateStatus(caremate) {
  if (!caremate || !caremate.recommendation || !window.MediPointCareMate) {
    return null;
  }

  const copy = window.MediPointCareMate.getRecommendationCopy(caremate.recommendation);
  if (copy.severity === 'critical') return 'Critical';
  if (copy.severity === 'warning') return 'Warning';
  return 'Normal';
}

function getOverallStatus(results) {
  if(!results.length){
    return 'No data';
  }

  const hasCritical = results.some(result => normalizeStatus(result.status) === 'Critical');
  const hasWarning = results.some(result => normalizeStatus(result.status) === 'Warning');

  if(hasCritical){
    return 'Critical';
  }

  if(hasWarning){
    return 'Warning';
  }

  return 'Normal';
}

async function buildPatientList() {
  const profiles = await fetchDoctorProfiles();

  const patients = await Promise.all(profiles.map(async profile => {
    const measurements = await getMeasurementsFor(profile);
    const latestResults = await getLatestResults(profile);
    const caremate = getLatestCaremate(profile, measurements);
    const caremateStatus = getCaremateStatus(caremate);
    const status = caremateStatus || getOverallStatus(latestResults);
    const lastRecord = measurements[0];
    const lastCheckin = lastRecord && lastRecord.date
      ? new Date(lastRecord.date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
      : 'No submissions';

    return {
      ...profile,
      latestResults,
      caremate,
      status,
      lastCheckin,
      patientId: MediPoint.getPublicIdNumber(profile) || profile.email || `${profile.name || 'patient'}-${profiles.indexOf(profile)}`
    };
  }));

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = `${patient.name || ''} ${MediPoint.getPublicIdNumber(patient) || ''}`.toLowerCase().includes(searchValue);
    const matchesFilter = activeFilter === 'All' || patient.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const counts = {
    total: patients.length,
    normal: patients.filter(patient => patient.status === 'Normal').length,
    warning: patients.filter(patient => patient.status === 'Warning').length,
    critical: patients.filter(patient => patient.status === 'Critical').length
  };

  setText(totalPatients, counts.total);
  setText(normalPatients, counts.normal);
  setText(monitorPatients, counts.warning);
  setText(urgentPatients, counts.critical);

  if(!filteredPatients.length){
    patientList.innerHTML = '<div class="empty">No patient records match the current search.</div>';
    return;
  }

  if(!selectedPatientId && filteredPatients[0]){
    selectedPatientId = filteredPatients[0].patientId;
  }

  patientList.innerHTML = filteredPatients.map(patient => `
    <button type="button" class="patient-item ${selectedPatientId === patient.patientId ? 'active' : ''}" data-patient-id="${MediPoint.escapeHTML(patient.patientId)}">
      <div class="patient-top">
        <div>
          <strong>${MediPoint.escapeHTML(patient.name || 'Unknown User')}</strong>
          <span>${MediPoint.escapeHTML(MediPoint.getPublicIdNumber(patient) || 'No ID')}</span>
        </div>
        <span class="patient-badge ${patient.status.toLowerCase()}">${patient.status}</span>
      </div>
      <div class="patient-badges">
        <span class="patient-badge">${MediPoint.escapeHTML(patient.role || 'Student')}</span>
        <span class="patient-badge">${MediPoint.escapeHTML(patient.lastCheckin)}</span>
      </div>
      <div class="patient-meta">
        <span>${MediPoint.escapeHTML(patient.latestResults.length ? patient.latestResults[0].title : 'No results yet')}</span>
        <span>${MediPoint.escapeHTML(patient.latestResults.length ? patient.latestResults[0].value : '—')}</span>
      </div>
    </button>
  `).join('');

  if(selectedPatientId){
    const chosen = filteredPatients.find(patient => patient.patientId === selectedPatientId);
    if(chosen){
      renderPatientDetail(chosen);
    }else{
      renderPatientDetail(filteredPatients[0]);
      selectedPatientId = filteredPatients[0].patientId;
    }
  }
}

function renderPatientDetail(patient) {
  if(!patientDetail){
    return;
  }

  const summary = patient.latestResults.length
    ? patient.latestResults.slice(0, 4).map(result => `
        <div class="detail-item">
          <strong>${MediPoint.escapeHTML(result.title)}</strong>
          <span>${MediPoint.escapeHTML(result.value)} ${MediPoint.escapeHTML(result.unit || '')}</span>
          <p>${MediPoint.escapeHTML(result.note || 'Measurement recorded successfully.')}</p>
        </div>
      `).join('')
    : '<div class="detail-item"><strong>No results recorded</strong><p>This patient has not completed a kiosk assessment yet.</p></div>';

  const recommendation = patient.caremate && patient.caremate.recommendation && window.MediPointCareMate
    ? window.MediPointCareMate.getRecommendationCopy(patient.caremate.recommendation).summary
    : patient.status === 'Critical'
      ? 'Escalate to clinician review and prepare for immediate follow-up.'
      : patient.status === 'Warning'
        ? 'Continue monitoring and schedule a follow-up check-in.'
        : 'No urgent follow-up required. Routine review is sufficient.';

  patientDetail.innerHTML = `
    <div class="detail-header">
      <h3>${MediPoint.escapeHTML(patient.name || 'Unknown User')}</h3>
      <p>${MediPoint.escapeHTML(MediPoint.getPublicIdNumber(patient) || 'No ID')} • ${MediPoint.escapeHTML(patient.role || 'Student')} • Last check-in ${MediPoint.escapeHTML(patient.lastCheckin)}</p>
      <p><strong>Status:</strong> ${patient.status}</p>
      <p>${recommendation}</p>
    </div>
    <div class="detail-list">
      ${summary}
    </div>
  `;
}

function setStaffIdentity() {
  const profile = currentStaff;
  const displayName = profile && profile.name ? profile.name : 'Clinical Staff';
  const displayRole = profile && profile.role ? profile.role : 'Doctor / Clinical Staff';

  setText(staffName, displayName);
  setText(staffRole, displayRole);
  setText(staffInitials, getInitials(displayName));
  setText(todayStamp, new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }));
  setText(heroStatus, 'Ready for review');
  setText(heroText, 'Use the list below to inspect patient submissions and flag urgent requests.');
}

function attachEvents() {
  if(staffLogoutBtn){
    staffLogoutBtn.addEventListener('click', () => {
      MediPoint.clearCurrentUser();
      window.location.href = '../login-pages/portal-auth.html';
    });
  }

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      filterButtons.forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      activeFilter = button.dataset.filter || 'All';
      buildPatientList();
    });
  });

  if(patientSearch){
    patientSearch.addEventListener('input', event => {
      searchValue = String(event.target.value || '').toLowerCase();
      buildPatientList();
    });
  }

  if(patientList){
    patientList.addEventListener('click', event => {
      const button = event.target.closest('[data-patient-id]');
      if(button){
        selectedPatientId = button.dataset.patientId;
        buildPatientList();
      }
    });
  }
}

setStaffIdentity();
attachEvents();
void buildPatientList();
