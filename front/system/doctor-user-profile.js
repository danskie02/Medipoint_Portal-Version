(function () {
  'use strict';

  const staff = MediPoint.getCurrentUser();
  if (!staff || staff.role !== 'doctor' || !staff.managedAccount) {
    MediPoint.clearCurrentUser();
    window.location.replace('../login-pages/portal-auth.html');
    return;
  }

  const escape = MediPoint.escapeHTML;
  const params = new URLSearchParams(window.location.search);
  const requestedUserId = String(params.get('user') || '').trim();

  const profilePanel = document.getElementById('userProfilePanel');
  const assessmentSelect = document.getElementById('assessmentSelect');
  const assessmentDetail = document.getElementById('assessmentDetail');

  document.querySelectorAll('[data-staff-name]').forEach(node => {
    node.textContent = staff.name;
  });
  document.querySelectorAll('[data-staff-initials]').forEach(node => {
    node.textContent = staff.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  });
  document.querySelectorAll('[data-today]').forEach(node => {
    node.textContent = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  });
  document.querySelectorAll('[data-logout]').forEach(button => {
    button.addEventListener('click', () => {
      MediPoint.clearCurrentUser();
      window.location.href = '../login-pages/portal-auth.html';
    });
  });

  function profileKey(user) {
    return String(
      MediPoint.getProfileId(user) ||
      MediPoint.getPublicIdNumber(user) ||
      user.email ||
      user.name ||
      'unknown'
    );
  }

  function formatProfileDate(value) {
    if (!value) return '';
    const dateValue = String(value);
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? `${dateValue}T00:00:00` : dateValue);
    return Number.isNaN(date.getTime())
      ? dateValue
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatAssessmentLabel(record, index, total) {
    const date = record && record.date
      ? new Date(record.date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
      : 'Date unavailable';
    return `${date} · Assessment ${total - index} of ${total}`;
  }

  function statusForResults(results) {
    if (!results.length) return 'No data';
    const statuses = results.map(item => String(item.status || '').toLowerCase());
    if (statuses.some(value => /critical|high|fever/.test(value))) return 'Critical';
    if (statuses.some(value => /warning|low|attention/.test(value))) return 'Warning';
    return 'Normal';
  }

  function splitWeightBmi(results) {
    const separated = [];
    results.forEach(result => {
      const title = String(result.title || '').toLowerCase();
      const value = String(result.value || '');
      if (title.includes('weight') && title.includes('bmi')) {
        const weightMatch = value.match(/([\d.]+)\s*kg/i);
        const bmiMatch = value.match(/bmi[:\s]*([\d.]+)/i);
        separated.push({
          title: 'Weight',
          value: weightMatch ? weightMatch[1] : value,
          unit: 'kg',
          status: result.status || 'Normal',
        });
        separated.push({
          title: 'BMI',
          value: bmiMatch ? bmiMatch[1] : 'Not available',
          unit: '',
          status: result.status || 'Normal',
        });
      } else {
        separated.push(result);
      }
    });
    return separated;
  }

  async function fetchDoctorProfiles() {
    if (!window.MEDIPOINT_SUPABASE_URL || !window.MEDIPOINT_SUPABASE_ANON_KEY) {
      return MediPoint.getUsers().filter(user => user.role === 'student' || user.role === 'personnel');
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

      return data.profiles.filter(user => user.role === 'student' || user.role === 'personnel');
    } catch (error) {
      console.warn('Unable to refresh user profile from Supabase.', error);
      return MediPoint.getUsers().filter(user => user.role === 'student' || user.role === 'personnel');
    }
  }

  async function fetchAssessmentsFor(profile) {
    const remoteAssessments = await MediPoint.fetchAssessmentsFromDatabase(profile);
    if (remoteAssessments !== null) {
      return remoteAssessments.sort((first, second) => new Date(second.date || 0) - new Date(first.date || 0));
    }

    const idNumber = MediPoint.getPublicIdNumber(profile) || profile.email || 'guest';
    return MediPoint.getMeasurements(idNumber).sort((first, second) => new Date(second.date || 0) - new Date(first.date || 0));
  }

  function renderProfile(user, assessments) {
    if (!profilePanel) return;

    if (!user) {
      profilePanel.innerHTML = `
        <p class="empty-monitor">This user could not be found.</p>
        <p><a class="profile-back-link" href="doctor-users.html">Return to the user directory</a></p>
      `;
      return;
    }

    const latest = assessments[0] || null;
    const latestResults = latest && Array.isArray(latest.results)
      ? (window.MediPointCareMate
        ? window.MediPointCareMate.stripCareMateResults(latest.results)
        : latest.results)
      : [];
    const status = statusForResults(latestResults);
    const fields = [
      ['Full name', user.name],
      ['Role', user.role],
      ['ID number', MediPoint.getPublicIdNumber(user)],
      ['Date of birth', formatProfileDate(user.birthday || user.dob || user.birthDate)],
      ['Gender', user.gender],
      ['Email', user.email],
      ['Mobile number', user.phone || user.mobile],
      ['Program / department', user.program || user.departmentOffice || user.department || user.section],
      ['Permanent barangay', user.barangay],
      ['Permanent city / municipality', user.city || user.municipality],
      ['Permanent province', user.province],
      ['Present barangay', user.presentBarangay],
      ['Present city / municipality', user.presentCity],
      ['Present province', user.presentProvince],
      ['Emergency contact', user.emergencyContact || user.emergencyContactName],
      ['Relationship to emergency contact', user.guardianRelationship],
      ['Emergency number', user.emergencyPhone],
      ['Medical conditions', Array.isArray(user.medicalHistory) && user.medicalHistory.length ? user.medicalHistory.join(', ') : 'None reported'],
      ['Other medical condition', user.otherMedicalHistory],
      ['Previous surgeries', user.previousSurgeries],
      ['Date of previous surgeries', user.previousSurgeryDate],
      ['Current medications', user.currentMedications],
      ['Known allergies', user.knownAllergies],
      ['Registered kiosk', user.kiosk || user.registeredKiosk],
      ['Member since', formatProfileDate(user.memberSince)],
    ];

    profilePanel.innerHTML = `
      <div class="user-profile-heading">
        <div>
          <h3>${escape(user.name || 'Unknown user')}</h3>
          <p>${escape(user.role || 'User')} · ${escape(MediPoint.getPublicIdNumber(user) || 'No ID')} · ${assessments.length} assessment${assessments.length === 1 ? '' : 's'}</p>
        </div>
        <span class="status-pill ${status.toLowerCase().replace(' ', '-')}">${escape(status)}</span>
      </div>
      <div class="user-profile-grid">
        ${fields.map(([label, value]) => `
          <div class="user-profile-field">
            <span>${escape(label)}</span>
            <strong>${escape(value || 'Not provided')}</strong>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderCareMate(caremate) {
    if (!caremate || !caremate.recommendation || !window.MediPointCareMate) {
      return `
        <section class="caremate-panel empty-caremate" aria-label="CareMate AI recommendation">
          <h3>CareMate AI recommendation</h3>
          <p class="empty-monitor">No AI recommendation is stored for this assessment.</p>
        </section>
      `;
    }

    const copy = window.MediPointCareMate.getRecommendationCopy(caremate.recommendation);
    const summary = window.MediPointCareMate.analysisSummary(caremate);
    const findings = window.MediPointCareMate.findingsFromCareMate(caremate);
    const findingsMarkup = findings.length
      ? `<div class="caremate-findings-panel">
          <h4>What the measurements indicate</h4>
          <ul>
            ${findings.map(finding => `
              <li class="${finding.attention ? 'attention' : 'normal'}">
                <strong>${escape(finding.metric)}</strong>
                <span>${escape(finding.categoryLabel)}</span>
                <p>${escape(finding.text)}</p>
              </li>
            `).join('')}
          </ul>
        </div>`
      : '';

    return `
      <section class="caremate-panel caremate-${escape(copy.severity)}" aria-label="CareMate AI recommendation">
        <div class="caremate-panel-heading">
          <span class="caremate-badge">AI</span>
          <div>
            <h3>CareMate: ${escape(copy.label)}</h3>
            <p>${escape(summary)}</p>
          </div>
        </div>
        ${findingsMarkup}
      </section>
    `;
  }

  function renderAssessment(record) {
    if (!assessmentDetail) return;

    if (!record) {
      assessmentDetail.innerHTML = '<p class="empty-monitor">No assessments are available for this user.</p>';
      return;
    }

    const rawResults = Array.isArray(record.results) ? record.results : [];
    const stripped = window.MediPointCareMate
      ? window.MediPointCareMate.stripCareMateResults(rawResults)
      : rawResults;
    const results = splitWeightBmi(stripped);
    const caremate = window.MediPointCareMate
      ? window.MediPointCareMate.extractCareMateFromAssessment(record)
      : (record.caremate || null);
    const checkIn = record.date
      ? new Date(record.date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
      : 'Date unavailable';
    const status = statusForResults(results);
    const resultMarkup = results.length
      ? results.map(result => {
        const value = String(result.value ?? 'Not recorded');
        const unit = String(result.unit || '');
        const displayValue = unit && value.toLowerCase().includes(unit.toLowerCase())
          ? value
          : [value, unit].filter(Boolean).join(' ');
        return `
          <div class="user-result-row">
            <strong>${escape(result.title || 'Assessment')}</strong>
            <span>${escape(displayValue)}</span>
            <small>${escape(result.status || '')}</small>
          </div>
        `;
      }).join('')
      : '<p class="empty-monitor">No assessment results recorded.</p>';

    assessmentDetail.innerHTML = `
      <div class="user-assessment-heading">
        <div>
          <h3>Selected assessment</h3>
          <span>${escape(checkIn)}</span>
        </div>
        <span class="status-pill ${status.toLowerCase().replace(' ', '-')}">${escape(status)}</span>
      </div>
      <div class="user-result-list">${resultMarkup}</div>
      ${renderCareMate(caremate)}
    `;
  }

  function populateAssessmentSelect(assessments) {
    if (!assessmentSelect) return;

    if (!assessments.length) {
      assessmentSelect.innerHTML = '<option value="">No assessments available</option>';
      assessmentSelect.disabled = true;
      renderAssessment(null);
      return;
    }

    assessmentSelect.disabled = false;
    assessmentSelect.innerHTML = assessments.map((record, index) => `
      <option value="${index}">${escape(formatAssessmentLabel(record, index, assessments.length))}</option>
    `).join('');
    assessmentSelect.value = '0';
    renderAssessment(assessments[0]);
  }

  async function loadProfile() {
    if (!requestedUserId) {
      renderProfile(null, []);
      populateAssessmentSelect([]);
      return;
    }

    const profiles = await fetchDoctorProfiles();
    profiles.forEach(profile => {
      const publicId = MediPoint.getPublicIdNumber(profile);
      if (publicId) profile.idNumber = publicId;
    });

    const matched = profiles.find(profile => profileKey(profile) === requestedUserId);
    if (!matched) {
      renderProfile(null, []);
      populateAssessmentSelect([]);
      return;
    }

    const assessments = await fetchAssessmentsFor(matched);
    renderProfile(matched, assessments);
    populateAssessmentSelect(assessments);

    if (assessmentSelect) {
      assessmentSelect.addEventListener('change', () => {
        const index = Number(assessmentSelect.value);
        renderAssessment(Number.isInteger(index) ? assessments[index] : null);
      });
    }
  }

  void loadProfile();
})();
