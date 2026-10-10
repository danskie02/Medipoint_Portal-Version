(function () {
  'use strict';
  const loginTab = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const department = document.getElementById('signupDepartment');
  const departmentLabel = document.getElementById('departmentLabel');
  const signupIdLabel = document.getElementById('signupIdLabel');
  const createdQr = document.getElementById('createdQr');
  const portalQrBox = document.getElementById('portalQrBox');
  const qrIdentity = document.getElementById('qrIdentity');
  const continuePortalBtn = document.getElementById('continuePortalBtn');
  const authShell = document.querySelector('.auth-shell');
  const authCard = document.querySelector('.auth-card');
  let newlyCreatedUser = null;
  const studentOptions = ['BS Computer Engineering','BS Civil Engineering','BS Electrical Engineering','BS Electronics Engineering','BS Mechanical Engineering','BS Information Technology','BS Information Systems','BS Computing Science','BS Criminology','BS Environmental Science','BS Midwifery','BS Nursing'];
  const personnelOptions = ['Clinic','Registrar','Accounting Office','Guidance Office','IT Department','Engineering Department','Nursing Department','Security Office','Library','Administration Office'];

  MediPoint.ensureClinicalAccount();

  function showView(view) {
    const isSignup = view === 'signup';
    loginForm.classList.toggle('hidden', isSignup);
    signupForm.classList.toggle('hidden', !isSignup);
    loginTab.classList.toggle('active', !isSignup);
    signupTab.classList.toggle('active', isSignup);
    history.replaceState(null, '', isSignup ? '?view=signup' : 'portal-auth.html');
  }

  function showMessage(element, message, error) {
    element.textContent = message;
    element.className = `message ${error ? 'error' : 'success'}`;
  }

  function enterPortal(user) {
    MediPoint.setCurrentUser(user);
    window.location.href = user.role === 'doctor' ? '../system/doctor-portal.html' : '../system/portal.html';
  }

  async function persistPortalSession(user) {
    const sessionUser = {
      ...user,
      idNumber: MediPoint.getPublicIdNumber(user) || user.idNumber,
      profileId: MediPoint.getProfileId(user) || user.id || '',
      accountType: user.accountType || 'portal'
    };

    MediPoint.saveUser(sessionUser);

    if (sessionUser.role !== 'doctor' && sessionUser.email) {
      try {
        await MediPoint.savePortalAccount(sessionUser);
      } catch (error) {
        console.warn('Could not save portal account locally.', error);
      }
    }
  }

  function authenticateLocalPortalUser(name, idNumber) {
    const user = MediPoint.authenticatePortalIdentity(name, idNumber);
    if (!user) {
      return { error: 'Full name or ID number is incorrect.' };
    }
    if (user.role === 'doctor' && !user.managedAccount) {
      return { error: 'This doctor account was not issued by MediPoint administration.' };
    }
    return { user };
  }

  loginTab.addEventListener('click', () => showView('login'));
  signupTab.addEventListener('click', () => showView('signup'));

  function supabaseReady() {
    return typeof window.MediPointKioskApi !== 'undefined'
      && window.MEDIPOINT_SUPABASE_URL
      && window.MEDIPOINT_SUPABASE_ANON_KEY
      && !String(window.MEDIPOINT_SUPABASE_URL).includes('YOUR_PROJECT_REF');
  }

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(loginForm);
    const message = document.getElementById('loginMessage');
    try {
      if(!supabaseReady()) {
        showMessage(message, 'Portal is not connected to the shared database. Add medipoint-config.js with your Supabase keys.', true);
        return;
      }

      const result = await window.MediPointKioskApi.portalAuth('login', {
        name: String(data.get('name') || '').trim(),
        idNumber: String(data.get('idNumber') || '').trim(),
      }, {
        kioskId: window.MEDIPOINT_KIOSK_ID || ''
      });

      if(result && result.user) {
        await persistPortalSession(result.user);
        showMessage(message, 'Account verified. Opening your portal...', false);
        enterPortal(result.user);
        return;
      }

      showMessage(message, (result && result.error) || 'Full name or ID number is incorrect.', true);
    } catch(error) {
      showMessage(message, error && error.message ? error.message : 'Portal login is unavailable.', true);
    }
  });

  signupForm.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(signupForm);
    const message = document.getElementById('signupMessage');
    const email = MediPoint.normalizeEmail(data.get('email'));
    const idNumber = String(data.get('idNumber') || '').trim();
    if(MediPoint.getPortalAccount(email)) {
      showMessage(message, 'A portal account already uses this email.', true);
      return;
    }
    if(MediPoint.getPortalAccounts().some(account => account.userId === idNumber)) {
      showMessage(message, 'A portal account already uses this ID.', true);
      return;
    }
    const existing = MediPoint.getUser(idNumber) || {};
    const selectedRole = String(data.get('role') || 'student');
    if(selectedRole !== 'student' && selectedRole !== 'personnel') {
      showMessage(message, 'Doctor accounts cannot be created publicly.', true);
      return;
    }
    const user = {
      ...existing,
      name: String(data.get('name') || '').trim(),
      idNumber,
      email,
      role: selectedRole,
      birthday: String(data.get('birthday') || ''),
      gender: String(data.get('gender') || ''),
      profileComplete: Boolean(existing.profileComplete),
      memberSince: existing.memberSince || new Date().toISOString(),
      program: selectedRole === 'student' ? String(data.get('department') || '') : '',
      departmentOffice: selectedRole !== 'student' ? String(data.get('department') || '') : ''
    };
    try {
      if(new Date(`${user.birthday}T00:00:00`) > new Date()) {
        showMessage(message, 'Birthday cannot be in the future.', true);
        return;
      }

      if(!supabaseReady()) {
        showMessage(message, 'Portal is not connected to the shared database. Add medipoint-config.js with your Supabase keys.', true);
        return;
      }

      const result = await window.MediPointKioskApi.portalAuth('signup', {
        name: user.name,
        email: user.email,
        birthday: user.birthday,
        gender: user.gender,
        idNumber: user.idNumber,
        role: user.role,
        department: user.role === 'student' ? user.program : user.departmentOffice,
      }, {
        kioskId: window.MEDIPOINT_KIOSK_ID || ''
      });

      if(!result || !result.user) {
        showMessage(message, (result && result.error) || 'Could not create the portal account.', true);
        return;
      }

      const savedUser = result.user;
      const remoteQrPayload = result.qrPayload || null;
      await MediPoint.savePortalAccount(savedUser);
      newlyCreatedUser = savedUser;
      if(savedUser.role === 'student' || savedUser.role === 'personnel') {
        MediPoint.saveUser({ ...savedUser, accountType: 'kiosk' });
        portalQrBox.innerHTML = '';
        const qrText = remoteQrPayload || `medipoint:v1:${savedUser.idNumber}`;
        new QRCode(portalQrBox, {
          text: qrText,
          width: 245,
          height: 245
        });
        qrIdentity.textContent = `${savedUser.name} • ${savedUser.idNumber}`;
        createdQr.classList.remove('hidden');
        signupForm.classList.add('qr-ready');
        authShell.classList.add('qr-ready');
        authCard.classList.add('qr-ready');
        signupForm.querySelector('button[type="submit"]').classList.add('hidden');
        showMessage(message, 'Portal and kiosk access created successfully.', false);
      } else {
        showMessage(message, 'Doctor portal account created. Opening the clinical portal...', false);
        enterPortal(savedUser);
      }
    } catch(error) {
      showMessage(message, 'Could not create the portal account.', true);
    }
  });

  continuePortalBtn.addEventListener('click', () => {
    if(newlyCreatedUser) enterPortal(newlyCreatedUser);
  });

  function updateRoleFields(role) {
    const isStudent = role === 'student';
    const options = isStudent ? studentOptions : personnelOptions;
    departmentLabel.textContent = isStudent ? 'Program' : 'Department / Office';
    signupIdLabel.textContent = isStudent ? 'Student Number' : role === 'doctor' ? 'Doctor ID' : 'Personnel ID';
    department.innerHTML = `<option value="" selected disabled>Select your ${isStudent ? 'program' : 'department / office'}</option>` +
      options.map(option => `<option value="${option}">${option}</option>`).join('');
  }

  signupForm.querySelectorAll('input[name="role"]').forEach(input => {
    input.addEventListener('change', () => updateRoleFields(input.value));
  });
  updateRoleFields('student');

  showView(new URLSearchParams(location.search).get('view') === 'signup' ? 'signup' : 'login');
})();
