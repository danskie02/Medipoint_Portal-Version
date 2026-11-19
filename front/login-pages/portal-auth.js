(function () {
  'use strict';
  const loginTab = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const changePasswordForm = document.getElementById('changePasswordForm');
  const forgotPasswordForm = document.getElementById('forgotPasswordForm');
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  const backToLoginLink = document.getElementById('backToLoginLink');
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
  let pendingPasswordChange = null;
  const studentOptions = ['BS Computer Engineering','BS Civil Engineering','BS Electrical Engineering','BS Electronics Engineering','BS Mechanical Engineering','BS Information Technology','BS Information Systems','BS Computing Science','BS Criminology','BS Environmental Science','BS Midwifery','BS Nursing'];
  const personnelOptions = ['Clinic','Registrar','Accounting Office','Guidance Office','IT Department','Engineering Department','Nursing Department','Security Office','Library','Administration Office'];

  MediPoint.ensureClinicalAccount();

  function showView(view) {
    const isSignup = view === 'signup';
    const isChange = view === 'change';
    const isForgot = view === 'forgot';
    loginForm.classList.toggle('hidden', view !== 'login');
    signupForm.classList.toggle('hidden', !isSignup);
    changePasswordForm.classList.toggle('hidden', !isChange);
    forgotPasswordForm.classList.toggle('hidden', !isForgot);
    loginTab.classList.toggle('active', view === 'login' || isChange || isForgot);
    signupTab.classList.toggle('active', isSignup);
    document.querySelector('.tabs').classList.toggle('hidden', isChange || isForgot);
    const nextUrl = isSignup ? '?view=signup' : isForgot ? '?view=forgot' : 'portal-auth.html';
    history.replaceState(null, '', nextUrl);
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

  function onlineAuthError() {
    if (typeof window.MediPointKioskApi === 'undefined' || !window.MEDIPOINT_SUPABASE_URL || !window.MEDIPOINT_SUPABASE_ANON_KEY) {
      return 'Online account service is not configured.';
    }
    return '';
  }

  function requirePasswordChange(user, currentPassword) {
    pendingPasswordChange = {
      user,
      name: user.name,
      currentPassword
    };
    showView('change');
    document.getElementById('newPassword').focus();
  }

  async function finishLogin(user) {
    const sessionUser = { ...user, mustChangePassword: false };
    await persistPortalSession(sessionUser);
    enterPortal(sessionUser);
  }

  loginTab.addEventListener('click', () => showView('login'));
  signupTab.addEventListener('click', () => showView('signup'));
  backToLoginLink.addEventListener('click', () => {
    resetForgotForm();
    showView('login');
  });

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(loginForm);
    const message = document.getElementById('loginMessage');
    const name = String(data.get('name') || '').trim();
    const password = String(data.get('password') || '');
    const configError = onlineAuthError();
    if (configError) {
      showMessage(message, configError, true);
      return;
    }

    try {
      const result = await window.MediPointKioskApi.portalAuth('login', {
        name,
        password,
        idNumber: password,
      }, {
        kioskId: window.MEDIPOINT_KIOSK_ID || ''
      });

      if(result && result.user) {
        if(result.mustChangePassword || result.user.mustChangePassword) {
          showMessage(message, 'Temporary password accepted. Choose a new password to continue.', false);
          requirePasswordChange(result.user, password);
          return;
        }
        await persistPortalSession(result.user);
        showMessage(message, 'Account verified. Opening your portal...', false);
        enterPortal(result.user);
        return;
      }

      showMessage(message, (result && result.error) || 'Full name or password is incorrect.', true);
    } catch (error) {
      showMessage(message, Number.isInteger(error && error.status)
        ? (error.message || 'Full name or password is incorrect.')
        : 'Could not connect to the online login service. Check the internet connection and try again.', true);
    }
  });

  changePasswordForm.addEventListener('submit', async event => {
    event.preventDefault();
    const message = document.getElementById('changePasswordMessage');
    const pending = pendingPasswordChange;
    if (!pending) {
      showView('login');
      return;
    }
    const newPassword = String(new FormData(changePasswordForm).get('newPassword') || '');
    const confirmPassword = String(new FormData(changePasswordForm).get('confirmPassword') || '');
    if (newPassword !== confirmPassword) {
      showMessage(message, 'Passwords do not match.', true);
      return;
    }
    const ruleError = MediPoint.newPasswordError(newPassword, MediPoint.getPublicIdNumber(pending.user));
    if (ruleError) {
      showMessage(message, ruleError, true);
      return;
    }

    const configError = onlineAuthError();
    if (configError) {
      showMessage(message, configError, true);
      return;
    }

    try {
      const result = await window.MediPointKioskApi.portalAuth('change-password', {
        name: pending.name,
        currentPassword: pending.currentPassword,
        newPassword,
      }, {
        kioskId: window.MEDIPOINT_KIOSK_ID || ''
      });

      if (result && result.error) {
        showMessage(message, result.error, true);
        return;
      }
      if (!(result && result.passwordUpdated && result.user)) {
        showMessage(message, 'Could not save the new password online.', true);
        return;
      }

      showMessage(message, 'Password saved. Opening your portal...', false);
      pendingPasswordChange = null;
      await finishLogin({ ...result.user, mustChangePassword: false });
    } catch (error) {
      showMessage(message, Number.isInteger(error && error.status)
        ? (error.message || 'Could not change the password.')
        : 'Could not connect to the online account service. Check the internet connection and try again.', true);
    }
  });

  let forgotOtpPending = null;

  function showForgotOtpStep(pending) {
    forgotOtpPending = pending;
    document.getElementById('forgotIdentityStep').classList.add('hidden');
    document.getElementById('forgotOtpStep').classList.remove('hidden');
    document.getElementById('forgotFormCopy').textContent =
      'Enter the code we emailed you, then choose a new password.';
    document.getElementById('forgotOtp').focus();
  }

  function resetForgotForm() {
    forgotOtpPending = null;
    document.getElementById('forgotIdentityStep').classList.remove('hidden');
    document.getElementById('forgotOtpStep').classList.add('hidden');
    document.getElementById('forgotFormCopy').textContent =
      'Confirm the name, ID number, and email on your account. We will email a verification code before you can set a new password.';
    document.getElementById('forgotPasswordMessage').textContent = '';
    document.getElementById('forgotOtpMessage').textContent = '';
  }

  async function requestForgotOtp(messageElement) {
    const name = String(document.getElementById('forgotName').value || '').trim();
    const idNumber = String(document.getElementById('forgotId').value || '').trim();
    const email = MediPoint.normalizeEmail(document.getElementById('forgotEmail').value);
    if (!name || !idNumber || !email) {
      showMessage(messageElement, 'Enter your full name, ID number, and email.', true);
      return;
    }

    const configError = onlineAuthError();
    if (configError) {
      showMessage(messageElement, configError, true);
      return;
    }

    try {
      const result = await window.MediPointKioskApi.portalAuth('forgot-password-request', {
        name,
        idNumber,
        email,
      }, {
        kioskId: window.MEDIPOINT_KIOSK_ID || ''
      });

      if (result && result.error) {
        showMessage(messageElement, result.error, true);
        return;
      }
      if (!(result && result.otpSent)) {
        showMessage(messageElement, 'Could not send the verification code.', true);
        return;
      }

      showForgotOtpStep({ name, idNumber, email });
      showMessage(document.getElementById('forgotOtpMessage'), result.message || 'Verification code sent. Check your email.', false);
    } catch (error) {
      showMessage(messageElement, Number.isInteger(error && error.status)
        ? (error.message || 'Those account details do not match our records.')
        : 'Could not connect to the online account service. Check the internet connection and try again.', true);
    }
  }

  forgotPasswordLink.addEventListener('click', () => {
    resetForgotForm();
    showView('forgot');
  });

  document.getElementById('resendOtpLink').addEventListener('click', () => {
    requestForgotOtp(document.getElementById('forgotOtpMessage'));
  });

  forgotPasswordForm.addEventListener('submit', async event => {
    event.preventDefault();
    const otpStepVisible = !document.getElementById('forgotOtpStep').classList.contains('hidden');

    if (!otpStepVisible) {
      await requestForgotOtp(document.getElementById('forgotPasswordMessage'));
      return;
    }

    const message = document.getElementById('forgotOtpMessage');
    const pending = forgotOtpPending;
    if (!pending) {
      resetForgotForm();
      return;
    }

    const code = String(document.getElementById('forgotOtp').value || '').trim();
    const newPassword = String(document.getElementById('forgotNewPassword').value || '');
    const confirmPassword = String(document.getElementById('forgotConfirmPassword').value || '');
    if (!code) {
      showMessage(message, 'Enter the verification code from your email.', true);
      return;
    }
    if (newPassword !== confirmPassword) {
      showMessage(message, 'Passwords do not match.', true);
      return;
    }
    const ruleError = MediPoint.newPasswordError(newPassword, pending.idNumber);
    if (ruleError) {
      showMessage(message, ruleError, true);
      return;
    }

    const configError = onlineAuthError();
    if (configError) {
      showMessage(message, configError, true);
      return;
    }

    try {
      const result = await window.MediPointKioskApi.portalAuth('forgot-password-confirm', {
        name: pending.name,
        idNumber: pending.idNumber,
        email: pending.email,
        code,
        newPassword,
      }, {
        kioskId: window.MEDIPOINT_KIOSK_ID || ''
      });

      if (result && result.error) {
        showMessage(message, result.error, true);
        return;
      }
      if (!(result && result.passwordUpdated && result.user)) {
        showMessage(message, 'Could not reset the password online.', true);
        return;
      }

      showMessage(message, 'Password updated. Opening your portal...', false);
      await finishLogin({ ...result.user, mustChangePassword: false });
    } catch (error) {
      showMessage(message, Number.isInteger(error && error.status)
        ? (error.message || 'Could not verify the code.')
        : 'Could not connect to the online account service. Check the internet connection and try again.', true);
    }
  });

  signupForm.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(signupForm);
    const message = document.getElementById('signupMessage');
    const email = MediPoint.normalizeEmail(data.get('email'));
    const idNumber = String(data.get('idNumber') || '').trim();
    const selectedRole = String(data.get('role') || 'student');
    if(selectedRole !== 'student' && selectedRole !== 'personnel') {
      showMessage(message, 'Doctor accounts cannot be created publicly.', true);
      return;
    }
    const user = {
      name: String(data.get('name') || '').trim(),
      idNumber,
      email,
      role: selectedRole,
      birthday: String(data.get('birthday') || ''),
      gender: String(data.get('gender') || ''),
      profileComplete: false,
      memberSince: new Date().toISOString(),
      program: selectedRole === 'student' ? String(data.get('department') || '') : '',
      departmentOffice: selectedRole !== 'student' ? String(data.get('department') || '') : ''
    };

    const configError = onlineAuthError();
    if (configError) {
      showMessage(message, configError, true);
      return;
    }

    try {
      if(new Date(`${user.birthday}T00:00:00`) > new Date()) {
        showMessage(message, 'Birthday cannot be in the future.', true);
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

      if (!(result && result.user)) {
        showMessage(message, (result && result.error) || 'Could not create the portal account.', true);
        return;
      }

      const savedUser = {
        ...result.user,
        idNumber: result.user.idNumber || user.idNumber,
        mustChangePassword: true
      };
      await MediPoint.savePortalAccount(savedUser);
      newlyCreatedUser = savedUser;
      if(savedUser.role === 'student' || savedUser.role === 'personnel') {
        MediPoint.saveUser({ ...savedUser, accountType: 'kiosk' });
        portalQrBox.innerHTML = '';
        const qrText = result.qrPayload || `medipoint:v1:${savedUser.idNumber}`;
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
        showMessage(message, 'Account created. Your ID number is the temporary password until you replace it.', false);
      } else {
        showMessage(message, 'Doctor portal account created. Opening the clinical portal...', false);
        enterPortal(savedUser);
      }
    } catch(error) {
      showMessage(message, Number.isInteger(error && error.status)
        ? (error.message || 'Could not create the portal account.')
        : 'Could not connect to the online account service. Check the internet connection and try again.', true);
    }
  });

  continuePortalBtn.addEventListener('click', () => {
    if(!newlyCreatedUser) return;
    requirePasswordChange(newlyCreatedUser, newlyCreatedUser.idNumber);
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

  const initialView = new URLSearchParams(location.search).get('view');
  showView(initialView === 'signup' ? 'signup' : initialView === 'forgot' ? 'forgot' : 'login');
})();
