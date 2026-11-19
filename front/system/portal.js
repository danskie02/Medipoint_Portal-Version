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
const pPresentBarangay = document.getElementById('pPresentBarangay');
const pPresentCity = document.getElementById('pPresentCity');
const pPresentProvince = document.getElementById('pPresentProvince');
const pPhone = document.getElementById('pPhone');
const pEmergency = document.getElementById('pEmergency');
const pEmergencyPhone = document.getElementById('pEmergencyPhone');
const pGuardianRelationship = document.getElementById('pGuardianRelationship');
const pMedicalHistory = document.getElementById('pMedicalHistory');
const pOtherMedicalHistory = document.getElementById('pOtherMedicalHistory');
const pPreviousSurgeries = document.getElementById('pPreviousSurgeries');
const pPreviousSurgeryDate = document.getElementById('pPreviousSurgeryDate');
const pCurrentMedications = document.getElementById('pCurrentMedications');
const pKnownAllergies = document.getElementById('pKnownAllergies');
const pDept = document.getElementById('pDept');
const pKiosk = document.getElementById('pKiosk');
const statLastCheckin = document.getElementById('statLastCheckin');
const statTotalAssessments = document.getElementById('statTotalAssessments');
const statLatestStatus = document.getElementById('statLatestStatus');
const kioskQrBox = document.getElementById('kioskQrBox');
const editProfileBtn = document.getElementById('editProfileBtn');
const changePhotoBtn = document.getElementById('changePhotoBtn');
const reportIssueBtn = document.getElementById('reportIssueBtn');

const resultsGrid = document.getElementById('resultsGrid');
const historyList = document.getElementById('historyList');
const portalReminder = document.getElementById('portalReminder');
const clinicRequestForm = document.getElementById('clinicRequestForm');
const userClinicRequestList = document.getElementById('userClinicRequestList');
const clinicRequestMessageStatus = document.getElementById('clinicRequestMessageStatus');

const searchInput = document.getElementById('searchInput');
const exportBtn = document.getElementById('exportBtn');

const normalCount = document.getElementById('normalCount');
const warningCount = document.getElementById('warningCount');
const criticalCount = document.getElementById('criticalCount');
const allCount = document.getElementById('allCount');

const overallStatus = document.getElementById('overallStatus');
const overallText = document.getElementById('overallText');
const recommendationList = document.getElementById('recommendationList');
const measurementFindings = document.getElementById('measurementFindings');
const measurementFindingsList = document.getElementById('measurementFindingsList');
const trendMetric = document.getElementById('trendMetric');
const trendChart = document.getElementById('trendChart');
const trendEmpty = document.getElementById('trendEmpty');
const trendLegend = document.getElementById('trendLegend');
const trendHistory = document.getElementById('trendHistory');
const heroStatus = document.getElementById('heroStatus');
const heroText = document.getElementById('heroText');
const userInfoForm = document.getElementById('userInfoForm');
const setupNotice = document.getElementById('setupNotice');

let activeFilter = 'All';
let displayedHistoryEvents = [];
let displayedClinicRequests = [];

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

function renderKioskQr(){
  if(!kioskQrBox){
    return;
  }

  const qrPayload = MediPoint.getKioskQrPayload(user);
  kioskQrBox.innerHTML = '';

  if(!qrPayload || typeof window.QRCode === 'undefined'){
    kioskQrBox.innerHTML = '<div class="qr-empty">QR unavailable</div>';
    return;
  }

  try {
    new QRCode(kioskQrBox, {
      text: qrPayload,
      width: 180,
      height: 180
    });
  } catch (error) {
    console.warn('Unable to render kiosk QR code.', error);
    kioskQrBox.innerHTML = '<div class="qr-empty">QR unavailable</div>';
  }
}

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
  setText(pPresentBarangay, user.presentBarangay || 'Not available');
  setText(pPresentCity, user.presentCity || 'Not available');
  setText(pPresentProvince, user.presentProvince || 'Not available');
  setText(pPhone, user.phone || user.mobile || 'Not available');
  setText(pEmergency, user.emergencyContact || user.emergencyContactName || 'Not available');
  setText(pGuardianRelationship, user.guardianRelationship || 'Not available');
  setText(pEmergencyPhone, user.emergencyPhone || 'Not available');
  setText(pMedicalHistory, Array.isArray(user.medicalHistory) && user.medicalHistory.length ? user.medicalHistory.join(', ') : 'None reported');
  setText(pOtherMedicalHistory, user.otherMedicalHistory || 'Not available');
  setText(pPreviousSurgeries, user.previousSurgeries || 'Not available');
  setText(pPreviousSurgeryDate, user.previousSurgeryDate || 'Not available');
  setText(pCurrentMedications, user.currentMedications || 'Not available');
  setText(pKnownAllergies, user.knownAllergies || 'Not available');
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
  renderKioskQr();

  if(userInfoForm){
    fillUserInfoForm();
  }

  activateCurrentNav();
  void renderCounts();
  void renderResults();
  void renderAssessment();
  void renderHistory();
  renderClinicRequests();
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
  const records = remoteAssessments !== null ? remoteAssessments : MediPoint.getMeasurements(idNumber);
  return records.sort((first, second) => new Date(second.date || 0) - new Date(first.date || 0));
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

function renderMeasurementFindings(caremate){
  if(!measurementFindings || !measurementFindingsList){
    return;
  }

  if(!caremate || !window.MediPointCareMate){
    measurementFindings.hidden = true;
    setHTML(measurementFindingsList, '');
    return;
  }

  const findings = window.MediPointCareMate.findingsFromCareMate(caremate);
  if(!findings.length){
    measurementFindings.hidden = true;
    setHTML(measurementFindingsList, '');
    return;
  }

  setHTML(measurementFindingsList, findings.map(finding => `
    <li class="measurement-finding ${finding.attention ? 'attention' : 'normal'}">
      <div class="measurement-finding-top">
        <strong>${MediPoint.escapeHTML(finding.metric)}</strong>
        <span>${MediPoint.escapeHTML(finding.categoryLabel)}</span>
      </div>
      <p>${MediPoint.escapeHTML(finding.text)}</p>
    </li>
  `).join(''));
  measurementFindings.hidden = false;
}

async function renderAssessment(){
  if(trendMetric){
    await renderAnalytics();
    return;
  }

  if(!overallStatus && !heroStatus && !recommendationList){
    return;
  }

  const latestResults = await getLatestResults();
  const caremate = await getLatestCaremate();

  if(!latestResults.length){
    setAssessmentState('No Data', 'Complete kiosk measurements first.', '');
    renderMeasurementFindings(null);
    setHTML(recommendationList, `<li>Complete your kiosk assessment to view recommendations.</li>`);
    return;
  }

  if(caremate && caremate.recommendation && window.MediPointCareMate){
    const copy = window.MediPointCareMate.getRecommendationCopy(caremate.recommendation);
    const bullets = window.MediPointCareMate.recommendationBullets(caremate.recommendation, caremate);
    const variant = copy.severity === 'critical'
      ? 'critical'
      : copy.severity === 'warning'
        ? 'warning'
        : 'normal';

    setAssessmentState(copy.label, window.MediPointCareMate.analysisSummary(caremate), variant);
    renderMeasurementFindings(caremate);
    setHTML(recommendationList, bullets.map(item => `<li>${item}</li>`).join(''));
    return;
  }

  renderMeasurementFindings(null);

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

function getTrendEntries(record){
  const results = window.MediPointCareMate
    ? window.MediPointCareMate.stripCareMateResults(splitWeightBmi(record.results || []))
    : splitWeightBmi(record.results || []);
  const entries = [];

  results.forEach(result => {
    const title = String(result.title || 'Measurement').trim();
    const value = String(result.value || '');
    if(title.toLowerCase().includes('blood pressure')){
      const pressure = value.match(/([\d.]+)\s*\/\s*([\d.]+)/);
      if(pressure){
        entries.push({ title: 'Blood Pressure · Systolic', unit: 'mmHg', value: Number(pressure[1]), status: result.status || 'Recorded' });
        entries.push({ title: 'Blood Pressure · Diastolic', unit: 'mmHg', value: Number(pressure[2]), status: result.status || 'Recorded' });
      }
      return;
    }

    const numeric = value.match(/-?\d+(?:\.\d+)?/);
    if(numeric){
      entries.push({ title, unit: result.unit || '', value: Number(numeric[0]), status: result.status || 'Recorded' });
    }
  });

  return entries;
}

function formatTrendNumber(value){
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatTrendDate(value, includeTime){
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleString('en-US', includeTime
    ? { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' }
    : { month:'short', day:'numeric', year:'numeric' });
}

function getSelectedTrendReadings(records){
  const title = trendMetric.value;
  return records
    .map(record => ({ record, entry: getTrendEntries(record).find(item => item.title === title) }))
    .filter(item => item.entry)
    .reverse();
}

function renderTrendSummary(readings){
  const latest = readings[readings.length - 1];
  const earliest = readings[0];
  setText(document.getElementById('trendLatest'), latest
    ? `${formatTrendNumber(latest.entry.value)}${latest.entry.unit ? ` ${latest.entry.unit}` : ''}`
    : '--');
  setText(document.getElementById('trendLatestDate'), latest ? formatTrendDate(latest.record.date, true) : 'No readings yet');
  setText(document.getElementById('trendRecordCount'), readings.length);

  if(readings.length > 1){
    const difference = latest.entry.value - earliest.entry.value;
    const sign = difference > 0 ? '+' : '';
    setText(document.getElementById('trendChange'), `${sign}${formatTrendNumber(difference)}${latest.entry.unit ? ` ${latest.entry.unit}` : ''}`);
    setText(document.getElementById('trendChangeNote'), `Since ${formatTrendDate(earliest.record.date, false)}; change only`);
  }else{
    setText(document.getElementById('trendChange'), '--');
    setText(document.getElementById('trendChangeNote'), 'At least two records are needed');
  }
}

function renderTrendChart(readings){
  const description = document.getElementById('trendDescription');
  const selected = trendMetric.options[trendMetric.selectedIndex];
  setText(description, selected && selected.dataset.unit
    ? `${selected.textContent} · ${selected.dataset.unit}`
    : selected ? selected.textContent : 'Choose a reading to view its history.');
  setHTML(trendLegend, selected && selected.dataset.unit
    ? `<span class="trend-key"></span><span>${MediPoint.escapeHTML(selected.textContent)} (${MediPoint.escapeHTML(selected.dataset.unit)})</span>`
    : '');

  if(!readings.length){
    trendChart.innerHTML = '';
    trendChart.hidden = true;
    trendEmpty.hidden = false;
    trendEmpty.textContent = 'No numeric readings are available for this measurement yet.';
    return;
  }

  trendChart.hidden = false;
  trendEmpty.hidden = true;
  const width = 800;
  const height = 300;
  const margin = { top: 22, right: 28, bottom: 48, left: 58 };
  const values = readings.map(item => item.entry.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = max === min ? Math.max(Math.abs(max) * 0.08, 1) : (max - min) * 0.15;
  const low = min - padding;
  const high = max + padding;
  const x = index => margin.left + (readings.length === 1 ? (width - margin.left - margin.right) / 2 : index * (width - margin.left - margin.right) / (readings.length - 1));
  const y = value => margin.top + (high - value) * (height - margin.top - margin.bottom) / (high - low);
  const points = readings.map((item, index) => `${x(index)},${y(item.entry.value)}`).join(' ');
  const ticks = 4;
  const grid = Array.from({ length: ticks + 1 }, (_, index) => {
    const value = low + (high - low) * index / ticks;
    const position = y(value);
    return `<line class="chart-grid" x1="${margin.left}" y1="${position}" x2="${width - margin.right}" y2="${position}"/><text class="chart-y-label" x="${margin.left - 10}" y="${position + 4}" text-anchor="end">${formatTrendNumber(value)}</text>`;
  }).join('');
  const marks = readings.map((item, index) => {
    const px = x(index);
    const py = y(item.entry.value);
    const dateLabel = formatTrendDate(item.record.date, false);
    const label = readings.length > 7 && index % Math.ceil(readings.length / 7) !== 0 && index !== readings.length - 1 ? '' : `<text class="chart-x-label" x="${px}" y="${height - 16}" text-anchor="middle">${MediPoint.escapeHTML(dateLabel)}</text>`;
    return `<circle class="chart-point" cx="${px}" cy="${py}" r="5"><title>${MediPoint.escapeHTML(dateLabel)}: ${formatTrendNumber(item.entry.value)} ${MediPoint.escapeHTML(item.entry.unit)}</title></circle>${label}`;
  }).join('');

  trendChart.setAttribute('aria-label', `Trend for ${selected ? selected.textContent : 'selected reading'} across ${readings.length} assessments`);
  trendChart.innerHTML = `${grid}<polyline class="chart-line" points="${points}"/>${marks}`;
}

function renderTrendHistory(readings){
  if(!readings.length){
    trendHistory.innerHTML = '<tr><td colspan="3">No readings recorded yet.</td></tr>';
    return;
  }

  trendHistory.innerHTML = readings.slice().reverse().map(({ record, entry }) => `
    <tr>
      <td>${MediPoint.escapeHTML(formatTrendDate(record.date, true))}</td>
      <td><strong>${formatTrendNumber(entry.value)} ${MediPoint.escapeHTML(entry.unit)}</strong></td>
      <td><span class="reading-status ${getStatusClass(entry.status)}">${MediPoint.escapeHTML(getDisplayStatus(entry.status))}</span></td>
    </tr>
  `).join('');
}

const DAILY_TREND_DAYS = 14;

function ageFromBirthday(profile){
  const raw = profile && (profile.birthday || profile.dob || profile.birthDate);
  if(!raw) return null;
  const born = new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(raw)) ? `${raw}T00:00:00` : raw);
  if(Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  if(now < new Date(now.getFullYear(), born.getMonth(), born.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

function dayKeyFromDate(value){
  const date = value instanceof Date ? value : new Date(value);
  if(Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildLastNDayKeys(days){
  const keys = [];
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  for(let offset = days - 1; offset >= 0; offset -= 1){
    const day = new Date(cursor);
    day.setDate(cursor.getDate() - offset);
    keys.push(dayKeyFromDate(day));
  }
  return keys;
}

function formatDayLabel(dayKey){
  const date = new Date(`${dayKey}T12:00:00`);
  if(Number.isNaN(date.getTime())) return dayKey;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function renderDailyBarChart(container, items, options = {}){
  if(!container) return;
  const { emptyText = 'No data for this period.', barClass = '', showZero = true } = options;
  const max = Math.max(0, ...items.map(item => Number(item.value) || 0));
  if(!items.length || (!showZero && max <= 0)){
    container.innerHTML = `<p class="daily-bar-empty">${MediPoint.escapeHTML(emptyText)}</p>`;
    return;
  }

  container.innerHTML = items.map(item => {
    const value = Number(item.value) || 0;
    const height = max > 0 ? Math.max(value > 0 ? 8 : 2, (value / max) * 120) : 2;
    const display = item.display != null ? item.display : String(value);
    return `<div class="daily-bar-column" title="${MediPoint.escapeHTML(item.title || `${item.label}: ${display}`)}">
      <span class="daily-bar-value">${value > 0 || showZero ? MediPoint.escapeHTML(String(display)) : ''}</span>
      <div class="daily-bar ${barClass}" style="height:${height}px"></div>
      <span class="daily-bar-label">${MediPoint.escapeHTML(item.label)}</span>
    </div>`;
  }).join('');
}

function renderPersonalAnalyticsSnapshot(){
  const ageNode = document.getElementById('snapshotAge');
  if(!ageNode) return;

  const age = ageFromBirthday(user);
  const city = user.city || user.municipality || user.presentCity || '';
  const province = user.province || user.presentProvince || '';
  const location = [city, province].filter(Boolean).join(', ') || 'Not provided';

  setText(ageNode, age != null ? String(age) : '--');
  setText(document.getElementById('snapshotAgeNote'), age != null ? 'From date of birth' : 'Add birthday in profile');
  setText(document.getElementById('snapshotGender'), user.gender || 'Not provided');
  setText(document.getElementById('snapshotProgram'), user.program || user.departmentOffice || user.department || user.section || 'Not provided');
  setText(document.getElementById('snapshotLocation'), location);
}

function renderDailyTrends(records, readings){
  const volumeChart = document.getElementById('dailyVolumeChart');
  const metricChart = document.getElementById('dailyMetricChart');
  if(!volumeChart && !metricChart) return;

  const dayKeys = buildLastNDayKeys(DAILY_TREND_DAYS);
  const volumeByDay = Object.fromEntries(dayKeys.map(key => [key, 0]));
  records.forEach(record => {
    const key = dayKeyFromDate(record.date);
    if(Object.prototype.hasOwnProperty.call(volumeByDay, key)) volumeByDay[key] += 1;
  });

  const volumeItems = dayKeys.map(key => ({
    label: formatDayLabel(key),
    value: volumeByDay[key],
    title: `${formatDayLabel(key)}: ${volumeByDay[key]} check-in${volumeByDay[key] === 1 ? '' : 's'}`
  }));
  const checkins = volumeItems.reduce((total, item) => total + item.value, 0);
  const activeDays = volumeItems.filter(item => item.value > 0).length;
  setText(document.getElementById('dailyCheckinCount'), checkins);
  setText(document.getElementById('dailyActiveDays'), activeDays);
  renderDailyBarChart(volumeChart, volumeItems, { emptyText: 'No check-ins in the last 14 days.' });

  const selected = trendMetric && trendMetric.options[trendMetric.selectedIndex];
  const unit = selected && selected.dataset.unit ? selected.dataset.unit : '';
  const metricTitle = selected && selected.value ? selected.textContent : 'selected reading';
  setText(document.getElementById('dailyMetricChartTitle'), selected && selected.value
    ? `Daily average · ${selected.textContent}`
    : 'Daily average reading');

  const sums = Object.fromEntries(dayKeys.map(key => [key, { total: 0, count: 0 }]));
  readings.forEach(({ record, entry }) => {
    const key = dayKeyFromDate(record.date);
    if(!Object.prototype.hasOwnProperty.call(sums, key)) return;
    sums[key].total += entry.value;
    sums[key].count += 1;
  });

  const metricItems = dayKeys.map(key => {
    const bucket = sums[key];
    const average = bucket.count ? bucket.total / bucket.count : 0;
    return {
      label: formatDayLabel(key),
      value: average,
      display: bucket.count ? formatTrendNumber(average) : '0',
      title: bucket.count
        ? `${formatDayLabel(key)}: ${formatTrendNumber(average)}${unit ? ` ${unit}` : ''} (${bucket.count} reading${bucket.count === 1 ? '' : 's'})`
        : `${formatDayLabel(key)}: no readings`
    };
  });

  const metricValues = metricItems.filter(item => item.value > 0).map(item => item.value);
  if(metricValues.length){
    const average = metricValues.reduce((total, value) => total + value, 0) / metricValues.length;
    setText(document.getElementById('dailyMetricAverage'), `${formatTrendNumber(average)}${unit ? ` ${unit}` : ''}`);
  }else{
    setText(document.getElementById('dailyMetricAverage'), '--');
  }

  renderDailyBarChart(metricChart, metricItems, {
    barClass: 'metric',
    emptyText: `No ${metricTitle} readings in the last 14 days.`
  });
}

async function renderAnalytics(){
  renderPersonalAnalyticsSnapshot();
  const records = await getMeasurements();
  const metrics = new Map();
  records.forEach(record => getTrendEntries(record).forEach(entry => {
    if(!metrics.has(entry.title)) metrics.set(entry.title, entry.unit);
  }));

  const previousSelection = trendMetric.value;
  trendMetric.innerHTML = [...metrics.entries()].map(([title, unit]) =>
    `<option value="${MediPoint.escapeHTML(title)}" data-unit="${MediPoint.escapeHTML(unit)}">${MediPoint.escapeHTML(title)}</option>`
  ).join('');

  if(!metrics.size){
    trendMetric.innerHTML = '<option value="">No readings</option>';
    trendMetric.disabled = true;
    trendChart.hidden = true;
    trendEmpty.hidden = false;
    trendEmpty.textContent = 'Your readings will appear here after a kiosk assessment.';
    trendLegend.innerHTML = '';
    trendHistory.innerHTML = '<tr><td colspan="3">No readings recorded yet.</td></tr>';
    renderTrendSummary([]);
    renderDailyTrends(records, []);
    return;
  }

  trendMetric.disabled = false;
  if(metrics.has(previousSelection)) trendMetric.value = previousSelection;
  const readings = getSelectedTrendReadings(records);
  renderTrendSummary(readings);
  renderTrendChart(readings);
  renderTrendHistory(readings);
  renderDailyTrends(records, readings);
}

async function renderHistory(){
  if(!historyList){
    return;
  }

  const measurements = await getMeasurements();
  const followUp = MediPoint.getDoctorFollowUp(userId);
  const requests = MediPoint.getClinicRequestsForUser(userId);
  const events = MediPoint.buildHealthTimeline(measurements, followUp, false, requests);

  if(!events.length){
    displayedHistoryEvents = [];
    historyList.innerHTML = `<div class="empty">No history available.</div>`;
    return;
  }

  displayedHistoryEvents = events.map(event => {
    if(event.type !== 'clinic-request') return event;
    const request = requests.find(item => item.type === event.requestType &&
      (Array.isArray(item.history) && item.history.length ? item.history : [{ status: item.status, at: item.updatedAt || item.requestedAt }]).some(update =>
        (update.at || item.requestedAt) === event.date && (update.status || item.status) === event.status
      ));
    return { ...event, request };
  });

  historyList.innerHTML = `
    <div class="portal-table-scroll">
      <table class="portal-data-table history-data-table">
        <thead><tr><th scope="col">Date</th><th scope="col">Record</th><th scope="col">Summary</th><th scope="col">Status</th><th scope="col"><span class="visually-hidden">Details</span></th></tr></thead>
        <tbody>${displayedHistoryEvents.map((event, index) => {
          const record = getHistoryRecordLabel(event);
          const status = getHistoryRecordStatus(event);
          return `
            <tr>
              <td data-label="Date">${MediPoint.escapeHTML(formatTimelineDate(event.date))}</td>
              <td data-label="Record"><strong>${MediPoint.escapeHTML(record)}</strong></td>
              <td data-label="Summary">${MediPoint.escapeHTML(getHistoryRecordSummary(event))}</td>
              <td data-label="Status"><span class="portal-status-pill ${getHistoryStatusClass(status)}">${MediPoint.escapeHTML(status)}</span></td>
              <td data-label="Details"><button type="button" class="portal-table-action" data-history-index="${index}">View details</button></td>
            </tr>
          `;
        }).join('')}</tbody>
      </table>
    </div>
  `;
}

function getHistoryRecordLabel(event){
  if(event.type === 'assessment') return 'Health assessment';
  if(event.type === 'clinic-request') return `${event.requestType} request`;
  return 'Follow-up update';
}

function getHistoryRecordStatus(event){
  if(event.type !== 'assessment') return event.status || 'Recorded';
  const statuses = event.readings.map(reading => normalizeStatus(reading.status));
  if(statuses.includes('Critical')) return 'Critical';
  if(statuses.includes('Warning')) return 'Warning';
  if(statuses.includes('Recorded')) return 'Recorded';
  return event.readings.length ? 'Normal' : 'Recorded';
}

function getHistoryStatusClass(status){
  const value = String(status || '').toLowerCase();
  return ['normal', 'warning', 'critical', 'submitted', 'contacted', 'scheduled', 'resolved'].includes(value)
    ? value
    : getStatusClass(status);
}

function getHistoryRecordSummary(event){
  if(event.type === 'assessment'){
    const count = event.readings.length;
    return `${count} ${count === 1 ? 'measurement' : 'measurements'} · ${event.source || 'MediPoint kiosk'}`;
  }
  if(event.type === 'clinic-request'){
    return event.request?.message || `${event.requestType} request status update`;
  }
  const assigned = event.assignedTo ? `Assigned to ${event.assignedTo}` : 'Clinic follow-up';
  return event.dueDate ? `${assigned} · Due ${formatDate(event.dueDate)}` : assigned;
}

function getHistoryDetailMarkup(event){
  const facts = [
    ['Date', formatTimelineDate(event.date)],
    ['Record', getHistoryRecordLabel(event)],
    ['Status', getHistoryRecordStatus(event)]
  ];

  if(event.type === 'assessment'){
    facts.push(['Source', event.source || 'MediPoint kiosk']);
    if(event.context) facts.push(['Program / department', event.context]);
    const readings = event.readings.length ? event.readings.map(reading => `
      <article class="portal-detail-reading">
        <div><strong>${MediPoint.escapeHTML(reading.title)}</strong><span class="portal-status-pill ${getStatusClass(reading.status)}">${MediPoint.escapeHTML(getDisplayStatus(reading.status))}</span></div>
        <p class="portal-detail-reading-value">${MediPoint.escapeHTML(reading.value)} ${MediPoint.escapeHTML(reading.unit || '')}</p>
        ${reading.previous ? `<p>Previous: ${MediPoint.escapeHTML(reading.previous.value)} ${MediPoint.escapeHTML(reading.previous.unit)} · ${MediPoint.escapeHTML(formatTimelineDate(reading.previous.date))}</p>` : ''}
        ${reading.note ? `<p>${MediPoint.escapeHTML(reading.note)}</p>` : ''}
      </article>
    `).join('') : '<p class="empty">No measurements were attached to this assessment.</p>';
    return `${renderPortalDetailFacts(facts)}<section class="portal-dialog-section"><h3>Measurements</h3><div class="portal-detail-readings">${readings}</div></section>`;
  }

  if(event.type === 'clinic-request'){
    const request = event.request;
    if(request){
      facts.push(['Preferred date', request.preferredDate ? formatDate(request.preferredDate) : 'Not specified']);
      facts.push(['Scheduled date', request.scheduledAt ? formatDate(request.scheduledAt) : 'Not scheduled']);
      return `${renderPortalDetailFacts(facts)}<section class="portal-dialog-section"><h3>Message to the clinic</h3><p>${MediPoint.escapeHTML(request.message || 'No message provided.')}</p></section>${request.staffNote ? `<section class="portal-dialog-section"><h3>Clinic update</h3><p>${MediPoint.escapeHTML(request.staffNote)}</p></section>` : ''}`;
    }
  }

  facts.push(['Assigned to', event.assignedTo || 'Clinic follow-up']);
  facts.push(['Due date', event.dueDate ? formatDate(event.dueDate) : 'Not set']);
  return renderPortalDetailFacts(facts) + (event.note ? `<section class="portal-dialog-section"><h3>Update</h3><p>${MediPoint.escapeHTML(event.note)}</p></section>` : '');
}

function renderPortalDetailFacts(facts){
  return `<dl class="portal-detail-facts">${facts.map(([label, value]) => `<div><dt>${MediPoint.escapeHTML(label)}</dt><dd>${MediPoint.escapeHTML(value)}</dd></div>`).join('')}</dl>`;
}

if(historyList){
  historyList.addEventListener('click', event => {
    const trigger = event.target.closest('[data-history-index]');
    const record = trigger && displayedHistoryEvents[Number(trigger.dataset.historyIndex)];
    if(record){
      MediPoint.showPortalDetailDialog(getHistoryRecordLabel(record), getHistoryDetailMarkup(record));
    }
  });
}

function renderClinicRequests(){
  if(!userClinicRequestList && !portalReminder) return;
  const requests = MediPoint.getClinicRequestsForUser(userId)
    .sort((first, second) => new Date(second.requestedAt || 0) - new Date(first.requestedAt || 0));
  const openRequests = requests.filter(request => request.status !== 'Resolved');

  if(portalReminder){
    if(openRequests.length){
      portalReminder.hidden = false;
      portalReminder.innerHTML = `<strong>Clinic follow-up requested</strong><span>${openRequests.length === 1 ? 'Your request is' : `${openRequests.length} requests are`} ${MediPoint.escapeHTML(openRequests.map(request => request.status.toLowerCase()).join(', '))}. Check the status on your Requests page.</span><a href="requests.html">View request status</a>`;
    }else{
      portalReminder.hidden = true;
      portalReminder.textContent = '';
    }
  }

  if(!userClinicRequestList) return;
  displayedClinicRequests = requests;

  if(!requests.length){
    userClinicRequestList.innerHTML = `
      <div class="portal-table-scroll">
        <table class="portal-data-table request-data-table">
          <thead><tr><th scope="col">Request</th><th scope="col">Submitted</th><th scope="col">Preferred date</th><th scope="col">Status</th><th scope="col"><span class="visually-hidden">Details</span></th></tr></thead>
          <tbody><tr><td colspan="5" class="portal-table-empty">You have not sent a clinic request.</td></tr></tbody>
        </table>
      </div>
    `;
    return;
  }

  userClinicRequestList.innerHTML = `
    <div class="portal-table-scroll">
      <table class="portal-data-table request-data-table">
        <thead><tr><th scope="col">Request</th><th scope="col">Submitted</th><th scope="col">Preferred date</th><th scope="col">Status</th><th scope="col"><span class="visually-hidden">Details</span></th></tr></thead>
        <tbody>${requests.map((request, index) => `
          <tr>
            <td data-label="Request"><strong>${MediPoint.escapeHTML(request.type)}</strong></td>
            <td data-label="Submitted">${MediPoint.escapeHTML(formatTimelineDate(request.requestedAt))}</td>
            <td data-label="Preferred date">${MediPoint.escapeHTML(request.preferredDate ? formatDate(request.preferredDate) : 'Not specified')}</td>
            <td data-label="Status"><span class="portal-status-pill ${MediPoint.escapeHTML(String(request.status || '').toLowerCase())}">${MediPoint.escapeHTML(request.status)}</span></td>
            <td data-label="Details"><button type="button" class="portal-table-action" data-request-index="${index}">View details</button></td>
          </tr>
        `).join('')}</tbody>
      </table>
    </div>
  `;
}

function getClinicRequestDetailMarkup(request, status, date){
  const facts = [
    ['Request type', request.type || 'Follow-up'],
    ['Status', status || request.status || 'Submitted'],
    ['Submitted', formatTimelineDate(date || request.requestedAt)],
    ['Preferred date', request.preferredDate ? formatDate(request.preferredDate) : 'Not specified'],
    ['Scheduled date', request.scheduledAt ? formatDate(request.scheduledAt) : 'Not scheduled']
  ];
  const updates = (Array.isArray(request.history) ? request.history : []).map(update => `
    <li><strong>${MediPoint.escapeHTML(update.status || 'Update')}</strong><span>${MediPoint.escapeHTML(formatTimelineDate(update.at || request.requestedAt))}</span>${update.note ? `<p>${MediPoint.escapeHTML(update.note)}</p>` : ''}</li>
  `).join('');

  return `${renderPortalDetailFacts(facts)}
    <section class="portal-dialog-section"><h3>Message to the clinic</h3><p>${MediPoint.escapeHTML(request.message || 'No message provided.')}</p></section>
    ${request.staffNote ? `<section class="portal-dialog-section"><h3>Latest clinic update</h3><p>${MediPoint.escapeHTML(request.staffNote)}</p></section>` : ''}
    ${updates ? `<section class="portal-dialog-section"><h3>Request activity</h3><ol class="portal-request-history">${updates}</ol></section>` : ''}`;
}

if(userClinicRequestList){
  userClinicRequestList.addEventListener('click', event => {
    const trigger = event.target.closest('[data-request-index]');
    const request = trigger && displayedClinicRequests[Number(trigger.dataset.requestIndex)];
    if(request){
      MediPoint.showPortalDetailDialog(`${request.type || 'Clinic'} request`, getClinicRequestDetailMarkup(request));
    }
  });
}

function submitClinicRequest(event){
  event.preventDefault();
  const data = new FormData(clinicRequestForm);
  try {
    MediPoint.createClinicRequest({
      patientId: userId,
      patientName: user.name,
      type: data.get('type'),
      preferredDate: data.get('preferredDate'),
      message: data.get('message')
    });
    clinicRequestForm.reset();
    setText(clinicRequestMessageStatus, 'Your request has been saved in this browser.');
    renderClinicRequests();
    void renderHistory();
  } catch(error) {
    setText(clinicRequestMessageStatus, error.message || 'Your request could not be saved.');
  }
}

function formatTimelineDate(value){
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString('en-US', {
    month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit'
  });
}

function getReadingChange(currentValue, previous, unit){
  if(!previous || previous.unit !== unit) return '';

  const currentPair = String(currentValue).match(/^\s*(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)\s*$/);
  const previousPair = String(previous.value).match(/^\s*(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)\s*$/);
  if(currentPair && previousPair){
    const first = Number(currentPair[1]) - Number(previousPair[1]);
    const second = Number(currentPair[2]) - Number(previousPair[2]);
    return `${first > 0 ? '+' : ''}${first}/${second > 0 ? '+' : ''}${second} ${unit}`;
  }

  const currentNumber = String(currentValue).match(/^\s*(-?\d+(?:\.\d+)?)\s*$/);
  const previousNumber = String(previous.value).match(/^\s*(-?\d+(?:\.\d+)?)\s*$/);
  if(!currentNumber || !previousNumber) return '';

  const difference = Number(currentNumber[1]) - Number(previousNumber[1]);
  const formatted = Number.isInteger(difference) ? String(difference) : difference.toFixed(1);
  return `${difference > 0 ? '+' : ''}${formatted} ${unit}`.trim();
}

function getAssessmentSummaryFor(record){
  const results = Array.isArray(record && record.results) ? record.results : [];

  if (window.MediPointCareMate) {
    const caremate = window.MediPointCareMate.extractCareMateFromAssessment(record);
    if (caremate && caremate.recommendation) {
      return window.MediPointCareMate.analysisSummary(caremate);
    }
  }

  if(!results.length){
    return 'No measurements recorded yet.';
  }

  const hasCritical = results.some(result => normalizeStatus(result.status) === 'Critical');
  const hasWarning = results.some(result => normalizeStatus(result.status) === 'Warning');

  if(hasCritical){
    return 'Some measurements fell outside the normal range.';
  }

  if(hasWarning){
    return 'Several readings need monitoring and follow-up.';
  }

  return 'All recorded measurements are within the normal range.';
}

function getAssessmentStatusFor(record){
  const results = Array.isArray(record && record.results) ? record.results : [];

  if (window.MediPointCareMate) {
    const caremate = window.MediPointCareMate.extractCareMateFromAssessment(record);
    if (caremate && caremate.recommendation && window.MediPointCareMate) {
      const copy = window.MediPointCareMate.getRecommendationCopy(caremate.recommendation);
      if (copy.severity === 'critical') return 'Needs Attention';
      if (copy.severity === 'warning') return 'Monitor';
      return 'Normal';
    }
  }

  if(!results.length){
    return 'No Data';
  }

  const hasCritical = results.some(result => normalizeStatus(result.status) === 'Critical');
  const hasWarning = results.some(result => normalizeStatus(result.status) === 'Warning');

  if(hasCritical){
    return 'Needs Attention';
  }

  if(hasWarning){
    return 'Monitor';
  }

  return 'Normal';
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
  if(trendMetric){
    const records = await getMeasurements();
    const rows = records.flatMap(record => splitWeightBmi(record.results || []).map(result => [
      formatTrendDate(record.date, true),
      result.title || 'Measurement',
      result.value ?? '',
      result.unit || '',
      getDisplayStatus(result.status),
      result.note || ''
    ]));

    if(!rows.length){
      alert('No readings to export.');
      return;
    }

    function csvCell(value){
      let text = String(value ?? '');
      if(/^[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replaceAll('"', '""')}"`;
    }

    const csv = ['Visit date,Reading,Value,Unit,Status,Note', ...rows.map(row => row.map(csvCell).join(','))].join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'medipoint-reading-history.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return;
  }

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

function setupMobilePortalNav(){
  const sidePanel = document.querySelector('.side-panel');
  const sideNav = sidePanel?.querySelector('.side-nav');
  const brand = sidePanel?.querySelector('.brand-block');

  if(!sidePanel || !sideNav || !brand){
    return;
  }

  if(!sideNav.id){
    sideNav.id = 'portalNavigationLinks';
  }

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'side-panel-toggle';
  toggle.textContent = 'Menu';
  toggle.setAttribute('aria-controls', sideNav.id);
  toggle.setAttribute('aria-expanded', 'false');

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') !== 'true';
    sidePanel.classList.toggle('mobile-nav-expanded', expanded);
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.textContent = expanded ? 'Close menu' : 'Menu';
  });

  sideNav.addEventListener('click', event => {
    if(event.target.closest('a')){
      sidePanel.classList.remove('mobile-nav-expanded');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = 'Menu';
    }
  });

  sidePanel.classList.add('mobile-nav-enabled');
  brand.insertAdjacentElement('afterend', toggle);
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

document.querySelectorAll('.status-card[data-filter]').forEach(card => {
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

if(trendMetric){
  trendMetric.addEventListener('change', () => { void renderAnalytics(); });
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

if(clinicRequestForm){
  clinicRequestForm.addEventListener('submit', submitClinicRequest);
}

setupMobilePortalNav();
void bootstrapPortal();
