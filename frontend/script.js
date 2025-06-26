// Minimal login/signup/reset JS for index.html only

const authForm = document.getElementById('authForm');
const toggleAuth = document.getElementById('toggleAuth');
const authSubmit = document.getElementById('authSubmit');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const resetSection = document.getElementById('resetSection');
const resetRequestForm = document.getElementById('resetRequestForm');
const resetEmailInput = document.getElementById('resetEmail');
const resetRequestMsg = document.getElementById('resetRequestMsg');
const backToLogin = document.getElementById('backToLogin');

let isSignUp = false;

if (toggleAuth) {
    toggleAuth.addEventListener('click', () => {
        isSignUp = !isSignUp;
        updateAuthForm();
    });
}

function updateAuthForm() {
    if (!authSubmit) return;
    if (isSignUp) {
        authSubmit.textContent = 'Sign Up';
        toggleAuth.innerHTML = 'Already have an account? <strong>Sign In</strong>';
        if (emailInput) {
            emailInput.parentElement.style.display = 'block';
            emailInput.required = true;
        }
        if (passwordInput) passwordInput.parentElement.style.display = 'block';
    } else {
        authSubmit.textContent = 'Sign In';
        toggleAuth.innerHTML = 'Don\'t have an account? <strong>Sign Up</strong>';
        if (emailInput) {
            emailInput.parentElement.style.display = 'none';
            emailInput.required = false;
        }
        if (passwordInput) passwordInput.parentElement.style.display = 'block';
    }
}

if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const email = emailInput ? emailInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';
        if (isSignUp) {
            if (!username || !email || !password) {
                alert('Please fill in all required fields.');
                return;
            }
        } else {
            if (!username || !password) {
                alert('Please fill in all required fields.');
                return;
            }
        }
        try {
            let res;
            if (isSignUp) {
                res = await fetch('/api/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });
            } else {
                res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
            }
            if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Authentication failed.');
                return;
            }
            // On success, redirect to group page
            window.location.href = 'group.html';
        } catch (err) {
            alert('Login/Signup failed.');
        }
    });
}

if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (resetSection) resetSection.style.display = 'flex';
    });
}
if (backToLogin) {
    backToLogin.addEventListener('click', () => {
        if (resetSection) resetSection.style.display = 'none';
        if (resetRequestMsg) resetRequestMsg.textContent = '';
        if (resetRequestForm) resetRequestForm.reset();
    });
}
if (resetRequestForm) {
    resetRequestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = resetEmailInput.value.trim();
        if (!email) return;
        try {
            const res = await fetch('/api/request-password-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (res.ok) {
                resetRequestMsg.textContent = 'Reset link sent! Check your email.';
            } else {
                resetRequestMsg.textContent = data.error || 'Failed to send reset link.';
            }
        } catch {
            resetRequestMsg.textContent = 'Failed to send reset link.';
        }
    });
}

updateAuthForm();
