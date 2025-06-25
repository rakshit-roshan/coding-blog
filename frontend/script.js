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
    } else {
        authSubmit.textContent = 'Sign In';
        toggleAuth.innerHTML = 'Don\'t have an account? <strong>Sign Up</strong>';
    }
}

// --- Auth Handler ---
if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        if (!username) return alert('Username required');
        try {
            const res = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            if (!res.ok) throw new Error('Login failed');
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
        const res = await fetch('http://localhost:5000/api/messages');
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
        const res = await fetch('http://localhost:5000/api/messages');
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
        `;
        chatMessages.appendChild(div);
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
            await fetch('http://localhost:5000/api/messages', {
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

// --- Init ---
updateAuthForm();
