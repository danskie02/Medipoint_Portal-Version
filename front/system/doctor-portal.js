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
const followUpFilter = document.getElementById('followUpFilter');
const patientSort = document.getElementById('patientSort');
const clinicRequestSummary = document.getElementById('clinicRequestSummary');
const clinicRequestSummaryHeading = document.getElementById('clinicRequestSummaryHeading');
const clinicRequestSummaryMeta = document.getElementById('clinicRequestSummaryMeta');
const clinicRequestSummaryCount = document.getElementById('clinicRequestSummaryCount');

let activeFilter = 'All';
let activeFollowUpFilter = 'All';
let activeSort = 'urgency';
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
  const records = remoteAssessments !== null ? remoteAssessments : MediPoint.getMeasurements(userId);
  return records.sort((first, second) => new Date(second.date || 0) - new Date(first.date || 0));
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
    const latestRecord = measurements[0] || { results: [] };
    const rawResults = latestRecord.results || [];
    const latestResults = splitWeightBmi(window.MediPointCareMate
      ? window.MediPointCareMate.stripCareMateResults(rawResults)
      : rawResults);
    const caremate = getLatestCaremate(profile, measurements);
    const caremateStatus = getCaremateStatus(caremate);
    const status = caremateStatus || getOverallStatus(latestResults);
    const lastRecord = measurements[0];
    const patientId = MediPoint.getPublicIdNumber(profile) || profile.email || `${profile.name || 'patient'}-${profiles.indexOf(profile)}`;
    const lastCheckin = lastRecord && lastRecord.date
      ? new Date(lastRecord.date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
      : 'No submissions';
    const followUp = MediPoint.getDoctorFollowUp(patientId) || {
      status: 'New',
      assignedTo: currentStaff.name || '',
      dueDate: '',
      note: ''
    };

    return {
      ...profile,
      measurements,
      latestResults,
      caremate,
      status,
      lastCheckin,
      followUp,
      lastVisitDate: lastRecord && lastRecord.date ? new Date(lastRecord.date).getTime() : 0,
      patientId
    };
  }));

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = `${patient.name || ''} ${MediPoint.getPublicIdNumber(patient) || ''}`.toLowerCase().includes(searchValue);
    const matchesFilter = activeFilter === 'All' || patient.status === activeFilter;
    const matchesFollowUp = activeFollowUpFilter === 'All' || patient.followUp.status === activeFollowUpFilter;
    return matchesSearch && matchesFilter && matchesFollowUp;
  });

  const urgency = { Critical: 0, Warning: 1, Normal: 2, 'No data': 3 };
  filteredPatients.sort((first, second) => {
    if (activeSort === 'last-visit') return second.lastVisitDate - first.lastVisitDate;
    if (activeSort === 'follow-up-date') {
      const firstDate = first.followUp.dueDate ? new Date(`${first.followUp.dueDate}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
      const secondDate = second.followUp.dueDate ? new Date(`${second.followUp.dueDate}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
      return firstDate - secondDate || urgency[first.status] - urgency[second.status];
    }
    return urgency[first.status] - urgency[second.status] || second.lastVisitDate - first.lastVisitDate;
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
    renderPatientDetail(null);
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
        <span class="patient-badge workflow-${patient.followUp.status.toLowerCase().replaceAll(' ', '-')}" data-workflow-status="${MediPoint.escapeHTML(patient.followUp.status)}">${MediPoint.escapeHTML(patient.followUp.status)}</span>
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

  if(!patient){
    patientDetail.innerHTML = '<p class="empty">No case matches the current filters.</p>';
    return;
  }

  const caremateFindings = patient.caremate && window.MediPointCareMate
    ? window.MediPointCareMate.findingsFromCareMate(patient.caremate)
    : [];
  const recommendation = patient.caremate && patient.caremate.recommendation && window.MediPointCareMate
    ? window.MediPointCareMate.analysisSummary(patient.caremate)
    : patient.status === 'Critical'
      ? 'Escalate to clinician review and prepare for immediate follow-up.'
      : patient.status === 'Warning'
        ? 'Continue monitoring and schedule a follow-up check-in.'
        : 'No urgent follow-up required. Routine review is sufficient.';
  const findingsMarkup = caremateFindings.length
    ? `<div class="caremate-findings-panel">
        <h4>What the measurements indicate</h4>
        <ul>
          ${caremateFindings.map(finding => `
            <li class="${finding.attention ? 'attention' : 'normal'}">
              <strong>${MediPoint.escapeHTML(finding.metric)}</strong>
              <span>${MediPoint.escapeHTML(finding.categoryLabel)}</span>
              <p>${MediPoint.escapeHTML(finding.text)}</p>
            </li>
          `).join('')}
        </ul>
      </div>`
    : '';
  const followUp = patient.followUp;

  patientDetail.innerHTML = `
    <div class="detail-header">
      <h3>${MediPoint.escapeHTML(patient.name || 'Unknown User')}</h3>
      <p>${MediPoint.escapeHTML(MediPoint.getPublicIdNumber(patient) || 'No ID')} • ${MediPoint.escapeHTML(patient.role || 'Student')} • Last check-in ${MediPoint.escapeHTML(patient.lastCheckin)}</p>
      <p><strong>Clinical status:</strong> ${MediPoint.escapeHTML(patient.status)}</p>
      <p>${MediPoint.escapeHTML(recommendation)}</p>
      ${findingsMarkup}
    </div>
    <form class="follow-up-form" data-patient-id="${MediPoint.escapeHTML(patient.patientId)}">
      <h3>Follow-up work</h3>
      <label>Work status
        <select name="status">
          ${['New', 'Reviewed', 'Follow-up needed'].map(status => `<option value="${status}" ${followUp.status === status ? 'selected' : ''}>${status}</option>`).join('')}
        </select>
      </label>
      <label>Assigned staff member
        <input name="assignedTo" type="text" maxlength="100" value="${MediPoint.escapeHTML(followUp.assignedTo)}" placeholder="Staff member name" required>
      </label>
      <label>Follow-up due date
        <input name="dueDate" type="date" value="${MediPoint.escapeHTML(followUp.dueDate)}">
      </label>
      <label>Brief note
        <textarea name="note" maxlength="500" rows="3" placeholder="Next step or context">${MediPoint.escapeHTML(followUp.note)}</textarea>
      </label>
      <button class="primary-btn" type="submit">Save follow-up</button>
      ${followUp.updatedAt ? `<small>Updated ${MediPoint.escapeHTML(new Date(followUp.updatedAt).toLocaleString())} by ${MediPoint.escapeHTML(followUp.updatedBy || 'staff')}</small>` : ''}
    </form>
  `;
}

function formatTimelineDate(value){
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString('en-US', {
    month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit'
  });
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

function isNewClinicRequest(request){
  const status = String(request && request.status || '').toLowerCase();
  return status === 'submitted' || status === 'new';
}

function renderClinicRequestSummary(){
  if(!clinicRequestSummary) return;

  const requests = MediPoint.getClinicRequests()
    .sort((first, second) => new Date(second.requestedAt || 0) - new Date(first.requestedAt || 0));
  const newRequests = requests.filter(isNewClinicRequest);
  const latestNew = newRequests[0] || null;
  const latestAny = requests[0] || null;

  setText(clinicRequestSummaryCount, String(newRequests.length));
  clinicRequestSummary.classList.toggle('has-new', newRequests.length > 0);

  if(newRequests.length){
    const newestLabel = formatTimelineDate(latestNew.requestedAt);
    setText(clinicRequestSummaryHeading, newRequests.length === 1
      ? '1 new clinic request needs review'
      : `${newRequests.length} new clinic requests need review`);
    setText(clinicRequestSummaryMeta, latestNew
      ? `Latest message from ${latestNew.patientName || 'a portal user'} · received ${newestLabel}`
      : `Latest new request received ${newestLabel}`);
    setText(heroStatus, 'New clinic requests');
    setText(heroText, 'Open Clinic Requests to review new messages and follow-up preferences.');
    return;
  }

  if(latestAny){
    setText(clinicRequestSummaryHeading, 'No new clinic requests');
    setText(clinicRequestSummaryMeta, `Last request received ${formatTimelineDate(latestAny.requestedAt)}. Open the requests tab to review history.`);
  }else{
    setText(clinicRequestSummaryHeading, 'No clinic requests yet');
    setText(clinicRequestSummaryMeta, 'New patient messages and appointment requests will appear here.');
  }
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

  if(followUpFilter){
    followUpFilter.addEventListener('change', event => {
      activeFollowUpFilter = event.target.value || 'All';
      buildPatientList();
    });
  }

  if(patientSort){
    patientSort.addEventListener('change', event => {
      activeSort = event.target.value || 'urgency';
      buildPatientList();
    });
  }

  if(patientDetail){
    patientDetail.addEventListener('submit', event => {
      const form = event.target.closest('.follow-up-form');
      if(!form) return;
      event.preventDefault();
      const data = new FormData(form);
      try {
        MediPoint.saveDoctorFollowUp(form.dataset.patientId, {
          status: data.get('status'),
          assignedTo: data.get('assignedTo'),
          dueDate: data.get('dueDate'),
          note: data.get('note'),
          updatedBy: currentStaff.name || 'Clinical Staff'
        });
        buildPatientList();
      } catch(error) {
        console.error('Unable to save follow-up details.', error);
        window.alert('Follow-up details could not be saved in this browser.');
      }
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
renderClinicRequestSummary();
void buildPatientList();
