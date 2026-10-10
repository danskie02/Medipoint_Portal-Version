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

    const body = document.getElementById('userRows');
    if (body) {
      const query = String(document.getElementById('userDirectorySearch')?.value || '').trim().toLowerCase();
      const filtered = liveProfiles.filter(user => `${user.name} ${user.idNumber} ${user.role}`.toLowerCase().includes(query));
      body.innerHTML = filtered.length ? filtered.map(user => {
        const status = liveStatusFor(user);
        const record = liveRecords(user)[0];
        const dateText = record && record.date ? new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No check-in';
        return `<tr><td><strong>${escape(user.name || 'Unknown')}</strong></td><td>${escape(user.idNumber || '—')}</td><td>${escape(user.role || '—')}</td><td>${escape(user.program || user.departmentOffice || 'Not specified')}</td><td>${liveRecords(user).length}</td><td>${escape(dateText)}</td><td><span class="status-pill ${status.toLowerCase().replace(' ', '-')}">${status}</span></td></tr>`;
      }).join('') : '<tr><td colspan="7" class="empty-monitor">No users match this search.</td></tr>';
    }

    const roles = [{ label: 'Students', value: liveProfiles.filter(user => user.role === 'student').length }, { label: 'Personnel', value: liveProfiles.filter(user => user.role === 'personnel').length }];
    const statuses = ['Normal', 'Warning', 'Critical', 'No data'].map(label => ({ label, value: liveProfiles.filter(user => liveStatusFor(user) === label).length }));
    const roleChart = document.getElementById('roleMetrics');
    if (roleChart) roleChart.innerHTML = metricRows(roles);
    const statusChart = document.getElementById('statusMetrics');
    if (statusChart) statusChart.innerHTML = metricRows(statuses);

    const chart = document.getElementById('ageHistogram');
    if (chart) {
      const buckets = [{ label: 'Under 18', min: 0, max: 17 }, { label: '18–20', min: 18, max: 20 }, { label: '21–25', min: 21, max: 25 }, { label: '26–35', min: 26, max: 35 }, { label: '36–50', min: 36, max: 50 }, { label: '51+', min: 51, max: 200 }, { label: 'Unknown', unknown: true }];
      const values = buckets.map(bucket => ({ ...bucket, value: liveProfiles.filter(user => { const age = ageOf(user); return bucket.unknown ? age === null : age !== null && age >= bucket.min && age <= bucket.max; }).length }));
      const max = Math.max(1, ...values.map(item => item.value));
      chart.innerHTML = values.map(item => `<div class="histogram-column"><span class="histogram-value">${item.value}</span><div class="histogram-bar" style="height:${Math.max(3, (item.value / max) * 240)}px"></div><span class="histogram-label">${item.label}</span></div>`).join('');
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
    const filtered = profiles.filter(user => `${user.name} ${user.idNumber} ${user.role}`.toLowerCase().includes(query));
    body.innerHTML = filtered.length ? filtered.map(user => {
      const records = recordsFor(user);
      const status = statusFor(user);
      const latest = records[0];
      const dateText = latest && latest.date ? new Date(latest.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No check-in';
      return `<tr><td><strong>${escape(user.name || 'Unknown')}</strong></td><td>${escape(user.idNumber || '—')}</td><td>${escape(user.role || '—')}</td><td>${escape(user.program || user.departmentOffice || 'Not specified')}</td><td>${records.length}</td><td>${escape(dateText)}</td><td><span class="status-pill ${status.toLowerCase().replace(' ','-')}">${status}</span></td></tr>`;
    }).join('') : '<tr><td colspan="7" class="empty-monitor">No users match this search.</td></tr>';
  }

  function metricRows(items) {
    const max = Math.max(1,...items.map(item => item.value));
    return items.map(item => `<div class="metric-row"><span>${escape(item.label)}</span><div class="metric-track"><div class="metric-fill" style="width:${(item.value/max)*100}%"></div></div><strong>${item.value}</strong></div>`).join('');
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
})();
