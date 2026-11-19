(function () {
  'use strict';
  const staff = MediPoint.getCurrentUser();
  if(!staff || staff.role !== 'doctor' || !staff.managedAccount) {
    MediPoint.clearCurrentUser();
    window.location.replace('../login-pages/portal-auth.html');
    return;
  }

  async function fetchDoctorProfiles() {
    if(!window.MEDIPOINT_SUPABASE_URL || !window.MEDIPOINT_SUPABASE_ANON_KEY) {
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
      console.warn('Unable to refresh doctor monitoring data from Supabase.', error);
      return MediPoint.getUsers().filter(user => user.role === 'student' || user.role === 'personnel');
    }
  }

  async function fetchAssessmentsFor(profile) {
    const idNumber = MediPoint.getPublicIdNumber(profile) || '';
    const remoteAssessments = await MediPoint.fetchAssessmentsFromDatabase(profile);
    if (remoteAssessments !== null) {
      return remoteAssessments;
    }

    return MediPoint.getMeasurements(idNumber || profile.email || 'guest');
  }

  let profiles = MediPoint.getUsers().filter(user => user.role === 'student' || user.role === 'personnel');
  let selectedUserId = '';
  const recordsFor = user => Array.isArray(user.assessments) ? user.assessments : MediPoint.getMeasurements(user.idNumber || user.id || user.studentNumber);
  const statusFor = user => {
    const results = (recordsFor(user)[0] || { results:[] }).results || [];
    if(!results.length) return 'No data';
    const statuses = results.map(item => String(item.status || '').toLowerCase());
    if(statuses.some(value => /critical|high|fever/.test(value))) return 'Critical';
    if(statuses.some(value => /warning|low|attention/.test(value))) return 'Warning';
    return 'Normal';
  };
  const dateFor = user => {
    const record = recordsFor(user)[0];
    return record && record.date ? new Date(record.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'No check-in';
  };
  const escape = MediPoint.escapeHTML;

  document.querySelectorAll('[data-staff-name]').forEach(node => { node.textContent = staff.name; });
  document.querySelectorAll('[data-staff-initials]').forEach(node => {
    node.textContent = staff.name.split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase();
  });
  document.querySelectorAll('[data-today]').forEach(node => {
    node.textContent = new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  });
  document.querySelectorAll('[data-logout]').forEach(button => button.addEventListener('click', () => {
    MediPoint.clearCurrentUser();
    window.location.href = '../login-pages/portal-auth.html';
  }));

  async function refreshData() {
    const latestProfiles = await fetchDoctorProfiles();
    latestProfiles.forEach((profile) => {
      const publicId = MediPoint.getPublicIdNumber(profile);
      if (publicId) {
        profile.idNumber = publicId;
      }
    });

    const enrichedProfiles = await Promise.all(latestProfiles.map(async (profile) => ({
      ...profile,
      assessments: await fetchAssessmentsFor(profile),
    })));

    profiles = enrichedProfiles.length ? enrichedProfiles : profiles.map(profile => ({ ...profile, assessments: MediPoint.getMeasurements(MediPoint.getPublicIdNumber(profile)) }));
    const liveProfiles = profiles;
    const liveRecords = user => Array.isArray(user.assessments) ? user.assessments : [];
    const liveStatusFor = user => {
      const results = (liveRecords(user)[0] || { results: [] }).results || [];
      if (!results.length) return 'No data';
      const statuses = results.map(item => String(item.status || '').toLowerCase());
      if (statuses.some(value => /critical|high|fever/.test(value))) return 'Critical';
      if (statuses.some(value => /warning|low|attention/.test(value))) return 'Warning';
      return 'Normal';
    };

    const assessments = liveProfiles.reduce((total, user) => total + liveRecords(user).length, 0);
    const active = liveProfiles.filter(user => liveRecords(user).length).length;
    const urgent = liveProfiles.filter(user => liveStatusFor(user) === 'Critical').length;
    const values = { totalUsers: liveProfiles.length, totalAssessments: assessments, activeUsers: active, urgentUsers: urgent };
    Object.entries(values).forEach(([id, value]) => { const node = document.getElementById(id); if (node) node.textContent = value; });

    const query = String(document.getElementById('userDirectorySearch')?.value || '');
    renderUsers(query);

    const roles = [{ label: 'Students', value: liveProfiles.filter(user => user.role === 'student').length }, { label: 'Personnel', value: liveProfiles.filter(user => user.role === 'personnel').length }];
    const statuses = ['Normal', 'Warning', 'Critical', 'No data'].map(label => ({ label, value: liveProfiles.filter(user => liveStatusFor(user) === label).length }));
    const roleChart = document.getElementById('roleMetrics');
    if (roleChart) roleChart.innerHTML = metricRows(roles);
    const statusChart = document.getElementById('statusMetrics');
    if (statusChart) statusChart.innerHTML = metricRows(statuses);

    const genderCounts = countByLabel(liveProfiles, user => normalizeGenderLabel(user.gender));
    const genderItems = Object.entries(genderCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));
    const genderChart = document.getElementById('genderMetrics');
    if (genderChart) genderChart.innerHTML = genderItems.length ? metricRows(genderItems) : '<p class="empty-monitor">No gender data available.</p>';
    const genderHistogramMetrics = document.getElementById('genderHistogramMetrics');
    if (genderHistogramMetrics) genderHistogramMetrics.innerHTML = genderItems.length ? metricRows(genderItems) : '<p class="empty-monitor">No gender data available.</p>';

    const provinceCounts = countByLabel(liveProfiles, user => String(user.province || user.presentProvince || 'Unspecified').trim() || 'Unspecified');
    const cityCounts = countByLabel(liveProfiles, user => {
      const city = String(user.city || user.municipality || user.presentCity || '').trim();
      const province = String(user.province || user.presentProvince || '').trim();
      if (!city) return 'Unspecified';
      return province ? `${city}, ${province}` : city;
    });
    const locationItems = [
      ...Object.entries(provinceCounts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([label, value]) => ({ label: `Province · ${label}`, value })),
      ...Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([label, value]) => ({ label: `City · ${label}`, value })),
    ];
    const locationChart = document.getElementById('locationMetrics');
    if (locationChart) locationChart.innerHTML = locationItems.length ? metricRows(locationItems) : '<p class="empty-monitor">No location data available.</p>';

    const collegeCounts = {};
    liveProfiles.forEach(user => {
      const college = String(user.program || user.departmentOffice || user.department || user.section || 'Unspecified').trim();
      if (!college) {
        collegeCounts['Unspecified'] = (collegeCounts['Unspecified'] || 0) + 1;
        return;
      }
      collegeCounts[college] = (collegeCounts[college] || 0) + 1;
    });

    const chart = document.getElementById('ageHistogram');
    if (chart) {
      const buckets = [{ label: 'Under 18', min: 0, max: 17 }, { label: '18–20', min: 18, max: 20 }, { label: '21–25', min: 21, max: 25 }, { label: '26–35', min: 26, max: 35 }, { label: '36–50', min: 36, max: 50 }, { label: '51+', min: 51, max: 200 }, { label: 'Unknown', unknown: true }];
      const values = buckets.map(bucket => ({ ...bucket, value: liveProfiles.filter(user => { const age = ageOf(user); return bucket.unknown ? age === null : age !== null && age >= bucket.min && age <= bucket.max; }).length }));
      const max = Math.max(1, ...values.map(item => item.value));
      chart.innerHTML = values.map(item => `<div class="histogram-column"><span class="histogram-value">${item.value}</span><div class="histogram-bar" style="height:${Math.max(3, (item.value / max) * 240)}px"></div><span class="histogram-label">${item.label}</span></div>`).join('');
    }

    const collegeChart = document.getElementById('collegeHistogram');
    if (collegeChart) {
      const items = Object.entries(collegeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([label, value]) => ({ label, value }));

      const maxCollege = Math.max(1, ...items.map(item => item.value));
      collegeChart.innerHTML = items.length
        ? items.map(item => `<div class="histogram-column"><span class="histogram-value">${item.value}</span><div class="histogram-bar" style="height:${Math.max(3, (item.value / maxCollege) * 240)}px"></div><span class="histogram-label">${escape(item.label)}</span></div>`).join('')
        : '<p class="empty-monitor">No college or department data available.</p>';
    }

    const provinceChart = document.getElementById('provinceHistogram');
    if (provinceChart) {
      const items = Object.entries(provinceCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([label, value]) => ({ label, value }));
      const maxProvince = Math.max(1, ...items.map(item => item.value));
      provinceChart.innerHTML = items.length
        ? items.map(item => `<div class="histogram-column"><span class="histogram-value">${item.value}</span><div class="histogram-bar" style="height:${Math.max(3, (item.value / maxProvince) * 240)}px"></div><span class="histogram-label">${escape(item.label)}</span></div>`).join('')
        : '<p class="empty-monitor">No province data available.</p>';
    }

    renderClinicDailyTrends(liveProfiles, liveRecords);

    const summaryContainer = document.getElementById('summaryInsights');
    if (summaryContainer) {
      const usersWithAssessments = liveProfiles.filter(user => liveRecords(user).length).length;
      const usersWithoutAssessments = liveProfiles.length - usersWithAssessments;
      const completionRate = liveProfiles.length ? Math.round((liveProfiles.filter(user => user.profileComplete).length / liveProfiles.length) * 100) : 0;
      const topCollege = Object.entries(collegeCounts).sort((a, b) => b[1] - a[1])[0] || ['Unspecified', 0];
      const topGender = genderItems[0] || { label: 'Unspecified', value: 0 };
      const topProvince = Object.entries(provinceCounts).sort((a, b) => b[1] - a[1])[0] || ['Unspecified', 0];

      const insights = [
        { label: 'Profile complete', value: `${completionRate}%`, detail: `${liveProfiles.filter(user => user.profileComplete).length} of ${liveProfiles.length} users` },
        { label: 'Active users', value: String(usersWithAssessments), detail: `${Math.round((usersWithAssessments / Math.max(1, liveProfiles.length)) * 100)}% with at least one assessment` },
        { label: 'Pending review', value: String(usersWithoutAssessments), detail: 'Users without a recorded kiosk assessment' },
        { label: 'Top college', value: topCollege[0].length > 18 ? `${topCollege[0].slice(0, 18)}…` : topCollege[0], detail: `${topCollege[1]} registered users` },
        { label: 'Top gender', value: topGender.label, detail: `${topGender.value} registered users` },
        { label: 'Top province', value: topProvince[0].length > 18 ? `${topProvince[0].slice(0, 18)}…` : topProvince[0], detail: `${topProvince[1]} registered users` },
      ];

      summaryContainer.innerHTML = insights.map(item => `
        <article class="insight-card">
          <span>${escape(item.label)}</span>
          <strong>${escape(item.value)}</strong>
          <small>${escape(item.detail)}</small>
        </article>
      `).join('');
    }
  }

  function renderStats() {
    const assessments = profiles.reduce((total,user) => total + recordsFor(user).length,0);
    const active = profiles.filter(user => recordsFor(user).length).length;
    const urgent = profiles.filter(user => statusFor(user) === 'Critical').length;
    const values = { totalUsers:profiles.length, totalAssessments:assessments, activeUsers:active, urgentUsers:urgent };
    Object.entries(values).forEach(([id,value]) => { const node=document.getElementById(id); if(node) node.textContent=value; });
  }

  function renderUsers(search) {
    const body = document.getElementById('userRows');
    if(!body) return;
    const query = String(search || '').trim().toLowerCase();
    const filtered = profiles.filter(user => `${user.name || ''} ${MediPoint.getPublicIdNumber(user)} ${user.role || ''} ${user.email || ''} ${user.program || user.departmentOffice || ''}`.toLowerCase().includes(query));
    if(!filtered.some(user => profileKey(user) === selectedUserId)) {
      selectedUserId = filtered[0] ? profileKey(filtered[0]) : '';
    }
    body.innerHTML = filtered.length ? filtered.map(user => {
      const records = recordsFor(user);
      const status = statusFor(user);
      const latest = records[0];
      const dateText = latest && latest.date ? new Date(latest.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No check-in';
      const key = profileKey(user);
      return `<tr class="${selectedUserId === key ? 'selected' : ''}"><td><button type="button" class="user-select" data-user-id="${escape(key)}" aria-pressed="${selectedUserId === key}">${escape(user.name || 'Unknown')}<span>View profile</span></button></td><td>${escape(MediPoint.getPublicIdNumber(user) || '—')}</td><td>${escape(user.role || '—')}</td><td>${escape(user.program || user.departmentOffice || 'Not specified')}</td><td>${records.length}</td><td>${escape(dateText)}</td><td><span class="status-pill ${status.toLowerCase().replace(' ','-')}">${status}</span></td></tr>`;
    }).join('') : '<tr><td colspan="7" class="empty-monitor">No users match this search.</td></tr>';

    const profile = filtered.find(user => profileKey(user) === selectedUserId);
    renderUserProfile(profile);
  }

  function profileKey(user) {
    return String(MediPoint.getProfileId(user) || MediPoint.getPublicIdNumber(user) || user.email || user.name || 'unknown');
  }

  function renderUserProfile(user) {
    const panel = document.getElementById('selectedUserProfile');
    if(!panel) return;
    if(!user) {
      panel.innerHTML = '<p class="empty-monitor">Select a user to view their profile details.</p>';
      return;
    }

    const records = recordsFor(user);
    const latest = records[0] || null;
    const latestResults = latest && Array.isArray(latest.results) ? latest.results : [];
    const checkIn = latest && latest.date ? new Date(latest.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No check-in';
    const status = statusFor(user);
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
      ['Member since', formatProfileDate(user.memberSince)]
    ];
    const profileFields = fields.map(([label, value]) => `<div class="user-profile-field"><span>${escape(label)}</span><strong>${escape(value || 'Not provided')}</strong></div>`).join('');
    const resultMarkup = latestResults.length
      ? latestResults.slice(0, 10).map(result => {
        const value = String(result.value ?? 'Not recorded');
        const unit = String(result.unit || '');
        const displayValue = unit && value.toLowerCase().includes(unit.toLowerCase()) ? value : [value, unit].filter(Boolean).join(' ');
        return `<div class="user-result-row"><strong>${escape(result.title || 'Assessment')}</strong><span>${escape(displayValue)}</span><small>${escape(result.status || '')}</small></div>`;
      }).join('')
      : '<p class="empty-monitor">No assessment results recorded.</p>';

    panel.innerHTML = `
      <div class="user-profile-heading">
        <div><h3>${escape(user.name || 'Unknown user')}</h3><p>${escape(user.role || 'User')} · ${escape(MediPoint.getPublicIdNumber(user) || 'No ID')}</p></div>
        <span class="status-pill ${status.toLowerCase().replace(' ', '-')}">${escape(status)}</span>
      </div>
      <div class="user-profile-grid">${profileFields}</div>
      <section class="user-assessment-summary" aria-label="Latest assessment">
        <div class="user-assessment-heading"><h3>Latest assessment</h3><span>${escape(checkIn)} · ${records.length} total</span></div>
        <div class="user-result-list">${resultMarkup}</div>
      </section>`;
  }

  function formatProfileDate(value) {
    if(!value) return '';
    const dateValue = String(value);
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? `${dateValue}T00:00:00` : dateValue);
    return Number.isNaN(date.getTime()) ? dateValue : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const DAILY_TREND_DAYS = 14;

  function metricRows(items) {
    const max = Math.max(1,...items.map(item => item.value));
    return items.map(item => `<div class="metric-row"><span>${escape(item.label)}</span><div class="metric-track"><div class="metric-fill" style="width:${(item.value/max)*100}%"></div></div><strong>${item.value}</strong></div>`).join('');
  }

  function countByLabel(users, labelFor) {
    return users.reduce((counts, user) => {
      const label = String(labelFor(user) || 'Unspecified').trim() || 'Unspecified';
      counts[label] = (counts[label] || 0) + 1;
      return counts;
    }, {});
  }

  function normalizeGenderLabel(value) {
    const raw = String(value || '').trim();
    if (!raw) return 'Unspecified';
    const lower = raw.toLowerCase();
    if (lower === 'male' || lower === 'm') return 'Male';
    if (lower === 'female' || lower === 'f') return 'Female';
    if (lower === 'other' || lower === 'non-binary' || lower === 'nonbinary') return 'Other';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  function dayKeyFromDate(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function buildLastNDayKeys(days) {
    const keys = [];
    const cursor = new Date();
    cursor.setHours(12, 0, 0, 0);
    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const day = new Date(cursor);
      day.setDate(cursor.getDate() - offset);
      keys.push(dayKeyFromDate(day));
    }
    return keys;
  }

  function formatDayLabel(dayKey) {
    const date = new Date(`${dayKey}T12:00:00`);
    if (Number.isNaN(date.getTime())) return dayKey;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function assessmentDayStatus(results) {
    const statuses = (results || []).map(item => String(item.status || '').toLowerCase());
    if (!statuses.length) return 'none';
    if (statuses.some(value => /critical|high|fever|warning|low|attention/.test(value))) return 'urgent';
    return 'normal';
  }

  function renderClinicDailyTrends(liveProfiles, liveRecords) {
    const volumeChart = document.getElementById('clinicVolumeChart');
    const statusChart = document.getElementById('clinicStatusChart');
    if (!volumeChart && !statusChart) return;

    const dayKeys = buildLastNDayKeys(DAILY_TREND_DAYS);
    const buckets = Object.fromEntries(dayKeys.map(key => [key, { total: 0, urgent: 0, normal: 0 }]));

    liveProfiles.forEach(user => {
      liveRecords(user).forEach(record => {
        const key = dayKeyFromDate(record.date);
        if (!Object.prototype.hasOwnProperty.call(buckets, key)) return;
        buckets[key].total += 1;
        const dayStatus = assessmentDayStatus(record.results);
        if (dayStatus === 'urgent') buckets[key].urgent += 1;
        else if (dayStatus === 'normal') buckets[key].normal += 1;
      });
    });

    const volumeItems = dayKeys.map(key => ({
      label: formatDayLabel(key),
      value: buckets[key].total,
      title: `${formatDayLabel(key)}: ${buckets[key].total} assessment${buckets[key].total === 1 ? '' : 's'}`,
    }));
    const assessments = volumeItems.reduce((total, item) => total + item.value, 0);
    const activeDays = volumeItems.filter(item => item.value > 0).length;
    const urgentCount = dayKeys.reduce((total, key) => total + buckets[key].urgent, 0);

    const assessmentsNode = document.getElementById('clinicDailyAssessments');
    if (assessmentsNode) assessmentsNode.textContent = String(assessments);
    const activeNode = document.getElementById('clinicActiveDays');
    if (activeNode) activeNode.textContent = String(activeDays);
    const urgentNode = document.getElementById('clinicUrgentCount');
    if (urgentNode) urgentNode.textContent = String(urgentCount);

    const maxVolume = Math.max(1, ...volumeItems.map(item => item.value));
    if (volumeChart) {
      volumeChart.innerHTML = volumeItems.map(item => {
        const height = Math.max(item.value > 0 ? 8 : 2, (item.value / maxVolume) * 140);
        return `<div class="clinic-day-column" title="${escape(item.title)}"><span class="clinic-day-value">${item.value || ''}</span><div class="clinic-day-bar" style="height:${height}px"></div><span class="clinic-day-label">${escape(item.label)}</span></div>`;
      }).join('');
    }

    if (statusChart) {
      const maxMix = Math.max(1, ...dayKeys.map(key => buckets[key].urgent + buckets[key].normal));
      statusChart.innerHTML = dayKeys.map(key => {
        const urgent = buckets[key].urgent;
        const normal = buckets[key].normal;
        const total = urgent + normal;
        const stackHeight = Math.max(total > 0 ? 10 : 2, (total / maxMix) * 140);
        const urgentShare = total ? (urgent / total) * 100 : 0;
        const normalShare = total ? (normal / total) * 100 : 0;
        return `<div class="clinic-day-column" title="${escape(`${formatDayLabel(key)}: ${urgent} urgent/warning, ${normal} normal`)}">
          <span class="clinic-day-value">${total || ''}</span>
          <div class="clinic-day-stack" style="height:${stackHeight}px">
            <span class="clinic-stack-urgent" style="height:${urgentShare}%"></span>
            <span class="clinic-stack-normal" style="height:${normalShare}%"></span>
          </div>
          <span class="clinic-day-label">${escape(formatDayLabel(key))}</span>
        </div>`;
      }).join('');
    }
  }

  function renderAnalytics() {
    const roles = [{label:'Students',value:profiles.filter(user=>user.role==='student').length},{label:'Personnel',value:profiles.filter(user=>user.role==='personnel').length}];
    const statuses = ['Normal','Warning','Critical','No data'].map(label => ({label,value:profiles.filter(user=>statusFor(user)===label).length}));
    const roleChart=document.getElementById('roleMetrics'); if(roleChart) roleChart.innerHTML=metricRows(roles);
    const statusChart=document.getElementById('statusMetrics'); if(statusChart) statusChart.innerHTML=metricRows(statuses);
  }

  function ageOf(user) {
    if(!user.birthday) return null;
    const born=new Date(`${user.birthday}T00:00:00`); if(Number.isNaN(born.getTime())) return null;
    const now=new Date(); let age=now.getFullYear()-born.getFullYear();
    if(now < new Date(now.getFullYear(),born.getMonth(),born.getDate())) age--;
    return age;
  }

  function renderHistogram() {
    const chart=document.getElementById('ageHistogram'); if(!chart) return;
    const buckets=[{label:'Under 18',min:0,max:17},{label:'18–20',min:18,max:20},{label:'21–25',min:21,max:25},{label:'26–35',min:26,max:35},{label:'36–50',min:36,max:50},{label:'51+',min:51,max:200},{label:'Unknown',unknown:true}];
    const values=buckets.map(bucket => ({...bucket,value:profiles.filter(user => { const age=ageOf(user); return bucket.unknown ? age===null : age!==null&&age>=bucket.min&&age<=bucket.max; }).length}));
    const max=Math.max(1,...values.map(item=>item.value));
    chart.innerHTML=values.map(item=>`<div class="histogram-column"><span class="histogram-value">${item.value}</span><div class="histogram-bar" style="height:${Math.max(3,(item.value/max)*240)}px"></div><span class="histogram-label">${item.label}</span></div>`).join('');
  }

  refreshData();
  const search=document.getElementById('userDirectorySearch'); if(search) search.addEventListener('input',event=>renderUsers(event.target.value));
  const userRows = document.getElementById('userRows');
  if(userRows) userRows.addEventListener('click', event => {
    const button = event.target.closest('[data-user-id]');
    if(!button) return;
    selectedUserId = button.dataset.userId || '';
    renderUsers(document.getElementById('userDirectorySearch')?.value || '');
  });
})();
