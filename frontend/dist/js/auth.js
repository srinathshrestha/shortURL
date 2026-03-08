/**
 * Auth — login, register, token storage, page guards.
 * Token in localStorage as lv_token, email as lv_email.
 */

function hasToken() {
  return !!localStorage.getItem('lv_token');
}

function isDashboardPage() {
  return window.location.pathname.endsWith('dashboard.html') || window.location.pathname.endsWith('/dashboard');
}

function isIndexPage() {
  const p = window.location.pathname;
  return p === '/' || p === '' || p.endsWith('index.html');
}

function guardPage() {
  if (isDashboardPage() && !hasToken()) {
    window.location.href = '/index.html';
    return false;
  }
  if (isIndexPage() && hasToken()) {
    window.location.href = '/dashboard.html';
    return false;
  }
  return true;
}

function logout() {
  localStorage.removeItem('lv_token');
  localStorage.removeItem('lv_email');
  window.location.href = '/index.html';
}

function initAuthForms() {
  if (!isIndexPage()) return;

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginTab = document.getElementById('tab-login');
  const registerTab = document.getElementById('tab-register');
  const loginError = document.getElementById('login-error');
  const registerError = document.getElementById('register-error');

  if (!loginForm || !registerForm) return;

  function showLogin() {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    loginError.textContent = '';
    registerError.textContent = '';
  }

  function showRegister() {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    loginError.textContent = '';
    registerError.textContent = '';
  }

  loginTab.addEventListener('click', function(e) { e.preventDefault(); showLogin(); });
  registerTab.addEventListener('click', function(e) { e.preventDefault(); showRegister(); });

  // Password toggle (Show/Hide)
  function initPasswordToggle(inputId, toggleId) {
    var input = document.getElementById(inputId);
    var toggle = document.getElementById(toggleId);
    if (!input || !toggle) return;
    toggle.addEventListener('click', function() {
      if (input.type === 'password') {
        input.type = 'text';
        toggle.textContent = 'Hide';
      } else {
        input.type = 'password';
        toggle.textContent = 'Show';
      }
    });
  }
  initPasswordToggle('login-password', 'login-password-toggle');
  initPasswordToggle('register-password', 'register-password-toggle');
  initPasswordToggle('register-confirm', 'register-confirm-toggle');

  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    loginError.textContent = '';
    var submitBtn = loginForm.querySelector('button[type="submit"]');
    var origText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';
    var email = document.getElementById('login-email').value.trim();
    var password = document.getElementById('login-password').value;
    if (!email || !password) {
      submitBtn.disabled = false;
      submitBtn.textContent = origText;
      return;
    }
    try {
      var result = await apiLogin(email, password);
      localStorage.setItem('lv_token', result.token);
      localStorage.setItem('lv_email', email);
      window.location.href = '/dashboard.html';
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = origText;
      if (err.response) {
        if (err.response.status === 401) {
          loginError.textContent = 'Incorrect email or password';
        } else if (err.response.status >= 500) {
          loginError.textContent = 'Server error. Try again later.';
        } else {
          loginError.textContent = 'Something went wrong';
        }
      } else {
        loginError.textContent = 'Network error. Check your connection.';
      }
    }
  });

  registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    registerError.textContent = '';
    var submitBtn = registerForm.querySelector('button[type="submit"]');
    var origText = submitBtn.textContent;
    var email = document.getElementById('register-email').value.trim();
    var password = document.getElementById('register-password').value;
    var confirm = document.getElementById('register-confirm').value;
    if (!email || !password || !confirm) return;
    if (password.length < 8) {
      registerError.textContent = 'Password must be at least 8 characters';
      return;
    }
    if (password !== confirm) {
      registerError.textContent = 'Passwords do not match';
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';
    try {
      var res = await apiRegister(email, password);
      if (res.status === 409) {
        registerError.textContent = 'That email is already registered';
        submitBtn.disabled = false;
        submitBtn.textContent = origText;
        return;
      }
      if (res.status === 201) {
        var result = await apiLogin(email, password);
        localStorage.setItem('lv_token', result.token);
        localStorage.setItem('lv_email', email);
        window.location.href = '/dashboard.html';
      }
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = origText;
      if (err.response) {
        if (err.response.status === 409) {
          registerError.textContent = 'That email is already registered';
        } else if (err.response.status >= 500) {
          registerError.textContent = 'Server error. Try again later.';
        } else {
          registerError.textContent = 'Something went wrong';
        }
      } else {
        registerError.textContent = 'Network error. Check your connection.';
      }
    }
  });

  showLogin();
}
