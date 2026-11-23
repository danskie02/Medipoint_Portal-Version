(function () {
  'use strict';

  const currentStaff = MediPoint.getCurrentUser();
  if (!currentStaff) {
    window.location.replace('../login-pages/portal-auth.html');
  } else if (currentStaff.role === 'doctor' && !currentStaff.managedAccount) {
    MediPoint.clearCurrentUser();
    window.location.replace('../login-pages/portal-auth.html');
  } else if (currentStaff.role !== 'doctor') {
    window.location.replace('portal.html');
  }

  const staffName = document.getElementById('staffName');
  const staffRole = document.getElementById('staffRole');
  const staffInitials = document.getElementById('staffInitials');
  const todayStamp = document.getElementById('todayStamp');
  const staffLogoutBtn = document.getElementById('staffLogoutBtn');
  const doctorClinicRequestList = document.getElementById('doctorClinicRequestList');

  function setText(element, value) {
    if (element) element.textContent = value;
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

  function formatRequestDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Date unavailable'
      : date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
  }

  function isNewRequest(request) {
    const status = String(request && request.status || '').toLowerCase();
    return status === 'submitted' || status === 'new';
  }

  function isOpenRequest(request) {
    const status = String(request && request.status || '').toLowerCase();
    return status === 'contacted' || status === 'scheduled';
  }

  function renderRequestStats(requests) {
    setText(document.getElementById('totalRequests'), requests.length);
    setText(document.getElementById('newRequests'), requests.filter(isNewRequest).length);
    setText(document.getElementById('openRequests'), requests.filter(isOpenRequest).length);
    setText(document.getElementById('resolvedRequests'), requests.filter(request => String(request.status || '').toLowerCase() === 'resolved').length);
  }

  function renderClinicRequestQueue() {
    if (!doctorClinicRequestList) return;

    const requests = MediPoint.getClinicRequests()
      .sort((first, second) => new Date(second.requestedAt || 0) - new Date(first.requestedAt || 0));

    renderRequestStats(requests);

    if (!requests.length) {
      doctorClinicRequestList.innerHTML = `
        <div class="portal-table-scroll">
          <table class="portal-data-table doctor-request-table">
            <thead><tr><th scope="col">Patient</th><th scope="col">Request</th><th scope="col">Received</th><th scope="col">Status</th><th scope="col"><span class="visually-hidden">Details</span></th></tr></thead>
            <tbody><tr><td colspan="5" class="portal-table-empty">No clinic requests have been submitted.</td></tr></tbody>
          </table>
        </div>
      `;
      return;
    }

    doctorClinicRequestList.innerHTML = `
      <div class="portal-table-scroll">
        <table class="portal-data-table doctor-request-table">
          <thead><tr><th scope="col">Patient</th><th scope="col">Request</th><th scope="col">Received</th><th scope="col">Status</th><th scope="col"><span class="visually-hidden">Details</span></th></tr></thead>
          <tbody>${requests.map(request => `
            <tr class="${isNewRequest(request) ? 'request-row-new' : ''}">
              <td data-label="Patient"><strong>${MediPoint.escapeHTML(request.patientName || 'Portal user')}</strong><small class="doctor-request-id">ID ${MediPoint.escapeHTML(request.patientId || 'Not available')}</small></td>
              <td data-label="Request">${MediPoint.escapeHTML(request.type || 'Follow-up')}</td>
              <td data-label="Received">${MediPoint.escapeHTML(formatRequestDate(request.requestedAt))}</td>
              <td data-label="Status"><span class="portal-status-pill ${MediPoint.escapeHTML(String(request.status || 'Submitted').toLowerCase())}">${MediPoint.escapeHTML(request.status || 'Submitted')}</span></td>
              <td data-label="Details"><button type="button" class="portal-table-action" data-doctor-request-id="${MediPoint.escapeHTML(request.requestId)}">Review</button></td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    `;
  }

  function showDoctorRequestDetails(request) {
    const escape = MediPoint.escapeHTML;
    const facts = [
      ['Patient', request.patientName || 'Portal user'],
      ['Patient ID', request.patientId || 'Not available'],
      ['Request type', request.type || 'Follow-up'],
      ['Status', request.status || 'Submitted'],
      ['Received', formatRequestDate(request.requestedAt)],
      ['Preferred date', request.preferredDate ? formatRequestDate(request.preferredDate).split(',')[0] : 'Not specified'],
      ['Scheduled date', request.scheduledAt ? formatRequestDate(request.scheduledAt).split(',')[0] : 'Not scheduled'],
    ];
    const factsMarkup = `<dl class="portal-detail-facts">${facts.map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>`;
    const history = (Array.isArray(request.history) ? request.history : []).map(update => `
      <li><strong>${escape(update.status || 'Update')}</strong><span>${escape(formatRequestDate(update.at || request.requestedAt))}</span>${update.note ? `<p>${escape(update.note)}</p>` : ''}</li>
    `).join('');
    const updateForm = request.status !== 'Resolved' ? `
      <form class="doctor-request-update portal-dialog-section" data-request-id="${escape(request.requestId)}">
        <h3>Update request</h3>
        <label>Status
          <select name="status" required>
            ${['Contacted', 'Scheduled', 'Resolved'].map(status => `<option value="${status}" ${request.status === status ? 'selected' : ''}>${status}</option>`).join('')}
          </select>
        </label>
        <label>Appointment date
          <input name="scheduledAt" type="date" value="${escape(request.scheduledAt || '')}" ${request.status === 'Scheduled' ? 'required' : ''}>
        </label>
        <label>Update for user
          <input name="staffNote" type="text" maxlength="500" placeholder="Brief status update" required>
        </label>
        <button type="submit" class="primary-btn">Save update</button>
      </form>
    ` : '<p class="request-resolved-note">This request has been resolved.</p>';

    MediPoint.showPortalDetailDialog(`${request.type || 'Clinic'} request`, `
      ${factsMarkup}
      <section class="portal-dialog-section"><h3>Message from the user</h3><p>${escape(request.message || 'No message provided.')}</p></section>
      ${request.staffNote ? `<section class="portal-dialog-section"><h3>Latest clinic update</h3><p>${escape(request.staffNote)}</p></section>` : ''}
      ${history ? `<section class="portal-dialog-section"><h3>Request activity</h3><ol class="portal-request-history">${history}</ol></section>` : ''}
      ${updateForm}
    `);
  }

  function setStaffIdentity() {
    const displayName = currentStaff && currentStaff.name ? currentStaff.name : 'Clinical Staff';
    const displayRole = currentStaff && currentStaff.role ? currentStaff.role : 'Doctor / Clinical Staff';
    setText(staffName, displayName);
    setText(staffRole, displayRole);
    setText(staffInitials, getInitials(displayName));
    setText(todayStamp, new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }));
  }

  function attachEvents() {
    if (staffLogoutBtn) {
      staffLogoutBtn.addEventListener('click', () => {
        MediPoint.clearCurrentUser();
        window.location.href = '../login-pages/portal-auth.html';
      });
    }

    if (doctorClinicRequestList) {
      doctorClinicRequestList.addEventListener('click', event => {
        const trigger = event.target.closest('[data-doctor-request-id]');
        if (!trigger) return;
        const request = MediPoint.getClinicRequests().find(item => item.requestId === trigger.dataset.doctorRequestId);
        if (request) showDoctorRequestDetails(request);
      });
    }

    document.addEventListener('change', event => {
      const status = event.target.closest('.doctor-request-update select[name="status"]');
      const form = status && status.closest('.doctor-request-update');
      if (!form) return;
      const dateInput = form.querySelector('input[name="scheduledAt"]');
      if (dateInput) dateInput.required = status.value === 'Scheduled';
    });

    document.addEventListener('submit', event => {
      const form = event.target.closest('.doctor-request-update');
      if (!form) return;
      event.preventDefault();
      const data = new FormData(form);
      const requestId = form.dataset.requestId;
      try {
        MediPoint.updateClinicRequest(requestId, {
          status: data.get('status'),
          scheduledAt: data.get('scheduledAt'),
          staffNote: data.get('staffNote'),
          updatedBy: currentStaff.name || 'Clinical Staff',
        });
        renderClinicRequestQueue();
        const updatedRequest = MediPoint.getClinicRequests().find(item => item.requestId === requestId);
        if (updatedRequest) showDoctorRequestDetails(updatedRequest);
      } catch (error) {
        window.alert(error.message || 'The clinic request could not be updated.');
      }
    });
  }

  setStaffIdentity();
  attachEvents();
  renderClinicRequestQueue();
})();
