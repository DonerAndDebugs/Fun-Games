(function() {
  const USERS_KEY = 'sucuk-auth-users';
  const ACTIVE_KEY = 'sucuk-auth-active-user';

  const overlay = document.getElementById('auth-overlay');
  if (!overlay) return;

  const openBtn = document.getElementById('auth-open');
  const closeBtn = document.getElementById('auth-close');
  const logoutBtn = document.getElementById('auth-logout');
  const userLabel = document.getElementById('auth-user-label');
  const form = document.getElementById('auth-form');
  const usernameInput = document.getElementById('auth-username');
  const passwordInput = document.getElementById('auth-password');
  const confirmInput = document.getElementById('auth-confirm');
  const confirmRow = document.getElementById('auth-confirm-row');
  const messageEl = document.getElementById('auth-message');
  const submitBtn = document.getElementById('auth-submit');
  const modeButtons = overlay.querySelectorAll('.auth-mode');
  const titleEl = document.getElementById('auth-title');

  let mode = 'signup';
  let users = loadUsers();
  let activeUser = loadActiveUser();

  function loadUsers() {
    try {
      const stored = JSON.parse(localStorage.getItem(USERS_KEY));
      if (!Array.isArray(stored)) return [];
      return stored;
    } catch (e) {
      return [];
    }
  }

  function saveUsers() {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function loadActiveUser() {
    return localStorage.getItem(ACTIVE_KEY) || null;
  }

  function saveActiveUser(username) {
    if (username) {
      localStorage.setItem(ACTIVE_KEY, username);
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }
  }

  async function hashPassword(password) {
    try {
      const api = window.crypto && window.crypto.subtle;
      if (api) {
        const encoded = new TextEncoder().encode(password);
        const digest = await api.digest('SHA-256', encoded);
        const bytes = new Uint8Array(digest);
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) {
      // Basic fallback if crypto is unavailable
    }
    return btoa(password);
  }

  function setMessage(text, type = '') {
    messageEl.textContent = text;
    messageEl.className = `auth-message ${type}`;
  }

  function validatePassword(password) {
    const errors = [];
    const trimmed = password.trim();
    const longEnough = trimmed.length >= 16;
    const hasLower = /[a-z]/.test(trimmed);
    const hasUpper = /[A-Z]/.test(trimmed);
    const hasNumber = /\d/.test(trimmed);
    const hasSymbol = /[^A-Za-z0-9\s]/.test(trimmed);
    const words = trimmed.split(/\s+/).filter(Boolean);
    const isPassphrase = words.length >= 5 && words.length <= 7 && words.every(w => w.length >= 3);

    if (!(longEnough && hasLower && hasUpper && hasNumber && hasSymbol) && !isPassphrase) {
      errors.push('Password must be 16+ chars with upper, lower, number, symbol (or a 5–7 word passphrase).');
    }
    return errors;
  }

  function setMode(nextMode) {
    mode = nextMode;
    modeButtons.forEach(btn => {
      const isActive = btn.dataset.mode === nextMode;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });
    const isSignup = nextMode === 'signup';
    confirmRow.classList.toggle('hidden', !isSignup);
    submitBtn.textContent = isSignup ? 'Sign up' : 'Log in';
    titleEl.textContent = isSignup ? 'Create your account' : 'Welcome back';
    passwordInput.setAttribute('autocomplete', isSignup ? 'new-password' : 'current-password');
    setMessage('');
  }

  function openOverlay() {
    overlay.classList.remove('hidden');
    setMode(mode);
    usernameInput.focus();
  }

  function closeOverlay() {
    overlay.classList.add('hidden');
    setMessage('');
    form.reset();
    setMode('signup');
  }

  function updateAuthUI() {
    if (activeUser) {
      userLabel.textContent = activeUser;
      openBtn.textContent = 'Account';
      logoutBtn.classList.remove('hidden');
    } else {
      userLabel.textContent = 'Guest';
      openBtn.textContent = 'Sign up / Log in';
      logoutBtn.classList.add('hidden');
    }
    if (window.updatePomoAccountLabel) {
      window.updatePomoAccountLabel();
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    if (username.length < 3) {
      setMessage('Username must be at least 3 characters.', 'error');
      return;
    }
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length) {
      setMessage(passwordErrors.join(' '), 'error');
      return;
    }

    const hashed = await hashPassword(password);
    if (mode === 'signup') {
      if (password !== confirm) {
        setMessage('Passwords do not match.', 'error');
        return;
      }
      const exists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
      if (exists) {
        setMessage('Username already exists. Try logging in.', 'error');
        return;
      }
      users.push({ username, hash: hashed });
      saveUsers();
      activeUser = username;
      saveActiveUser(username);
      updateAuthUI();
      closeOverlay();
    } else {
      const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (!user) {
        setMessage('No account found. Please sign up first.', 'error');
        return;
      }
      if (user.hash !== hashed) {
        setMessage('Incorrect password.', 'error');
        return;
      }
      activeUser = user.username;
      saveActiveUser(user.username);
      updateAuthUI();
      closeOverlay();
    }
  }

  function handleLogout() {
    activeUser = null;
    saveActiveUser(null);
    updateAuthUI();
  }

  // Event bindings
  openBtn?.addEventListener('click', openOverlay);
  closeBtn?.addEventListener('click', closeOverlay);
  logoutBtn?.addEventListener('click', handleLogout);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeOverlay();
  });
  form?.addEventListener('submit', handleSubmit);
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetMode = btn.dataset.mode;
      if (targetMode === mode) return;
      setMode(targetMode);
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
      closeOverlay();
    }
  });

  // expose logout for other UI
  window.handleLogout = handleLogout;
  window.openAuthOverlay = openOverlay;

  // Initialize
  updateAuthUI();
})();
