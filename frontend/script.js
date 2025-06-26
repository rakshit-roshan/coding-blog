// --- State ---
let currentUser = null;
let users = [];
let messages = [];
let pollingInterval = null;

// --- DOM Elements ---
const authSection = document.getElementById('authSection');
const chatSection = document.getElementById('chatSection');
const authForm = document.getElementById('authForm');
const toggleAuth = document.getElementById('toggleAuth');
const authSubmit = document.getElementById('authSubmit');
const chatMessages = document.getElementById('chatMessages');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const currentUserSpan = document.getElementById('currentUser');
const logoutBtn = document.getElementById('logoutBtn');
const onlineList = document.getElementById('onlineList');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const resetSection = document.getElementById('resetSection');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const resetRequestForm = document.getElementById('resetRequestForm');
const resetEmailInput = document.getElementById('resetEmail');
const resetRequestMsg = document.getElementById('resetRequestMsg');
const backToLogin = document.getElementById('backToLogin');

let isSignUp = false;

// --- Auth Form Toggle ---
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

// --- Auth Handler ---
if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const email = emailInput ? emailInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';
        if (!username || (!isSignUp && !password) || (isSignUp && (!email || !password))) {
            alert('Please fill in all required fields.');
            return;
        }
        try {
            let res;
            if (isSignUp) {
                res = await fetch('https://coding-blog-kdzv.onrender.com/api/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });
            } else {
                res = await fetch('https://coding-blog-kdzv.onrender.com/api/login', {
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
            const user = await res.json();
            currentUser = user;
            showChatInterface();
        } catch (err) {
            alert('Login/Signup failed.');
        }
    });
}

// --- Show Chat UI ---
function showChatInterface() {
    if (authSection) authSection.style.display = 'none';
    if (chatSection) chatSection.style.display = 'flex';
    if (currentUserSpan) currentUserSpan.textContent = currentUser.username;
    fetchUsers();
    fetchMessages();
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(fetchMessages, 3000);
}

// --- Fetch Users ---
async function fetchUsers() {
    // For now, get all users from messages
    try {
        const res = await fetch('https://coding-blog-kdzv.onrender.com/api/messages');
        if (!res.ok) throw new Error('Failed to fetch users');
        const msgs = await res.json();
        const userSet = new Set(msgs.map(m => m.username));
        users = Array.from(userSet).map(username => ({ username }));
        renderOnlineUsers();
    } catch {}
}

function renderOnlineUsers() {
    if (!onlineList) return;
    onlineList.innerHTML = '';
    users.forEach(u => {
        const li = document.createElement('li');
        li.textContent = u.username;
        if (currentUser && u.username === currentUser.username) li.classList.add('active');
        onlineList.appendChild(li);
    });
}

// --- Fetch & Render Messages ---
async function fetchMessages() {
    try {
        const res = await fetch('https://coding-blog-kdzv.onrender.com/api/messages');
        if (!res.ok) throw new Error('Failed to fetch messages');
        messages = await res.json();
        renderMessages();
    } catch {}
}

function renderMessages() {
    if (!chatMessages) return;
    chatMessages.innerHTML = '';
    messages.forEach(msg => {
        const div = document.createElement('div');
        div.className = 'message' + (currentUser && msg.username === currentUser.username ? ' own' : '');
        div.innerHTML = `
            <div class="meta">${msg.username} • ${new Date(msg.created_at).toLocaleTimeString()}</div>
            <div class="content">${msg.content}</div>
            ${currentUser && msg.user_id === currentUser.id ? '<div class="delete-message" style="text-align:right;"><span class="delete-icon" data-id="' + msg.id + '" style="cursor:pointer; color:#e74c3c; font-size:14px;">🗑️ Delete</span></div>' : ''}
        `;
        chatMessages.appendChild(div);
    });
    // Add event listeners for delete icons
    document.querySelectorAll('.delete-icon').forEach(icon => {
        icon.addEventListener('click', async (e) => {
            const messageId = e.target.getAttribute('data-id');
            if (!messageId || !currentUser) return;
            if (!confirm('Are you sure you want to delete this message?')) return;
            try {
                const res = await fetch(`https://coding-blog-kdzv.onrender.com/api/messages/${messageId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: currentUser.id })
                });
                if (res.ok) {
                    fetchMessages();
                } else {
                    const data = await res.json();
                    alert(data.error || 'Failed to delete message.');
                }
            } catch {
                alert('Failed to delete message.');
            }
        });
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- Send Message ---
if (messageForm) {
    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = messageInput.value.trim();
        if (!content || !currentUser) return;
        try {
            await fetch('https://coding-blog-kdzv.onrender.com/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: currentUser.id, content })
            });
            messageInput.value = '';
            fetchMessages();
        } catch {}
    });
}

// --- Logout ---
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        currentUser = null;
        if (pollingInterval) clearInterval(pollingInterval);
        if (chatSection) chatSection.style.display = 'none';
        if (authSection) authSection.style.display = 'flex';
        if (authForm) authForm.reset();
        isSignUp = false;
        updateAuthForm();
    });
}

// --- Reset Password ---
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (authSection) authSection.style.display = 'none';
        if (resetSection) resetSection.style.display = 'flex';
    });
}
if (backToLogin) {
    backToLogin.addEventListener('click', () => {
        if (resetSection) resetSection.style.display = 'none';
        if (authSection) authSection.style.display = 'flex';
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
            const res = await fetch('https://coding-blog-kdzv.onrender.com/api/request-password-reset', {
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

// --- Init ---
updateAuthForm();
