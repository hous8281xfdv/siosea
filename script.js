// === НАСТРОЙКИ ===
const GEMINI_API_KEY = 'AQ.Ab8RN6JkXIqMYtl4sjW4GxtA6dtJpy7lr6WCv5gHA-_O7ZFfMQ';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const STORAGE_KEY = 'sio_chats';
let currentChatId = null;
let chats = [];

async function getAIResponse(userMessage) {
    try {
        const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: userMessage }] }]
            })
        });
        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
        } else {
            return '😕 Не удалось получить ответ. Попробуйте переформулировать вопрос.';
        }
    } catch (error) {
        console.error('Ошибка Gemini API:', error);
        return '❌ Ошибка соединения с сервером. Проверьте интернет.';
    }
}

function loadChats() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        chats = JSON.parse(saved);
        if (chats.length === 0) {
            createNewChat();
        } else {
            currentChatId = chats[0].id;
            renderHistory();
            loadChat(currentChatId);
        }
    } else {
        createNewChat();
    }
}

function saveChats() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

function createNewChat() {
    const newChat = {
        id: Date.now(),
        title: 'Новый чат',
        messages: [
            { role: 'ai', text: 'Привет! Я Sio — нейросеть на основе Google Gemini. Задай мне любой вопрос: напиши стих, объясни физику, придумай рецепт или просто поболтай. Чем могу помочь?', time: new Date().toLocaleTimeString() }
        ],
        createdAt: new Date().toISOString()
    };
    chats.unshift(newChat);
    currentChatId = newChat.id;
    saveChats();
    renderHistory();
    loadChat(currentChatId);
}

function loadChat(chatId) {
    const chat = chats.find(c => c.id == chatId);
    if (!chat) return;
    currentChatId = chat.id;
    renderMessages(chat.messages);
    updateActiveInHistory();
}

function renderMessages(messages) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    if (!messages || messages.length === 0) {
        container.innerHTML = '<div class="message ai-message"><div class="message-avatar"><i class="fas fa-robot"></i></div><div class="message-content"><div class="message-text">Напишите что-нибудь, чтобы начать диалог</div><div class="message-time">Сейчас</div></div></div>';
        return;
    }
    container.innerHTML = messages.map(msg => `
        <div class="message ${msg.role === 'user' ? 'user-message' : 'ai-message'}">
            <div class="message-avatar"><i class="fas ${msg.role === 'user' ? 'fa-user' : 'fa-robot'}"></i></div>
            <div class="message-content">
                <div class="message-text">${escapeHtml(msg.text)}</div>
                <div class="message-time">${msg.time || 'Сейчас'}</div>
            </div>
        </div>
    `).join('');
    scrollToBottom();
}

function scrollToBottom() {
    const container = document.getElementById('chatMessages');
    if (container) container.scrollTop = container.scrollHeight;
}

function renderHistory() {
    const container = document.getElementById('historyList');
    if (!container) return;
    if (chats.length === 0) {
        container.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">Нет диалогов</div>';
        return;
    }
    container.innerHTML = chats.map(chat => `
        <div class="history-item ${chat.id == currentChatId ? 'active' : ''}" data-id="${chat.id}">
            <span class="history-item-title">${escapeHtml(chat.title)}</span>
            <button class="history-item-delete" data-id="${chat.id}"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
    document.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('history-item-delete') || e.target.closest('.history-item-delete')) return;
            const id = parseInt(item.dataset.id);
            loadChat(id);
        });
    });
    document.querySelectorAll('.history-item-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            deleteChat(id);
        });
    });
}

function updateActiveInHistory() {
    document.querySelectorAll('.history-item').forEach(item => {
        const id = parseInt(item.dataset.id);
        if (id === currentChatId) item.classList.add('active');
        else item.classList.remove('active');
    });
}

function deleteChat(chatId) {
    const index = chats.findIndex(c => c.id == chatId);
    if (index !== -1) {
        chats.splice(index, 1);
        if (chats.length === 0) {
            createNewChat();
        } else {
            if (currentChatId == chatId) {
                currentChatId = chats[0].id;
                loadChat(currentChatId);
            }
            saveChats();
            renderHistory();
        }
    }
}

function updateChatTitle(chatId) {
    const chat = chats.find(c => c.id == chatId);
    if (chat && chat.messages.length > 1) {
        const firstUserMessage = chat.messages.find(m => m.role === 'user');
        if (firstUserMessage) {
            let title = firstUserMessage.text.slice(0, 30);
            if (firstUserMessage.text.length > 30) title += '...';
            chat.title = title;
            saveChats();
            renderHistory();
        }
    }
}

async function addMessage(chatId, role, text) {
    const chat = chats.find(c => c.id == chatId);
    if (chat) {
        chat.messages.push({
            role: role,
            text: text,
            time: new Date().toLocaleTimeString()
        });
        saveChats();
        if (role === 'user') updateChatTitle(chatId);
        loadChat(chatId);
    }
}

function showTypingIndicator() {
    const container = document.getElementById('chatMessages');
    const indicator = document.createElement('div');
    indicator.className = 'message ai-message typing-message';
    indicator.id = 'typingIndicator';
    indicator.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content">
            <div class="typing-indicator"><span></span><span></span><span></span></div>
        </div>
    `;
    container.appendChild(indicator);
    scrollToBottom();
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    if (!message) return;
    input.value = '';
    addMessage(currentChatId, 'user', message);
    showTypingIndicator();
    const reply = await getAIResponse(message);
    hideTypingIndicator();
    addMessage(currentChatId, 'ai', reply);
}

function clearCurrentChat() {
    const chat = chats.find(c => c.id == currentChatId);
    if (chat) {
        chat.messages = [
            { role: 'ai', text: 'Привет! Я Sio — нейросеть на основе Google Gemini. Задай мне любой вопрос, и я постараюсь ответить. Чем могу помочь?', time: new Date().toLocaleTimeString() }
        ];
        saveChats();
        loadChat(currentChatId);
        showToast('Чат очищен');
    }
}

function clearAllHistory() {
    chats = [];
    createNewChat();
    showToast('Вся история очищена');
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = msg;
    toast.style.position = 'fixed';
    toast.style.bottom = '80px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = '#333';
    toast.style.color = 'white';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '40px';
    toast.style.zIndex = '9999';
    toast.style.fontSize = '0.9rem';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

function initEventListeners() {
    document.getElementById('sendBtn')?.addEventListener('click', sendMessage);
    document.getElementById('newChatBtn')?.addEventListener('click', () => createNewChat());
    document.getElementById('mobileNewChat')?.addEventListener('click', () => { createNewChat(); document.getElementById('mobileNav')?.classList.remove('active'); document.getElementById('burgerMenu')?.classList.remove('active'); });
    document.getElementById('clearChatBtn')?.addEventListener('click', () => clearCurrentChat());
    document.getElementById('clearHistoryBtn')?.addEventListener('click', () => document.getElementById('confirmModal').style.display = 'flex');
    document.getElementById('confirmClearBtn')?.addEventListener('click', () => { clearAllHistory(); document.getElementById('confirmModal').style.display = 'none'; });
    document.getElementById('cancelModalBtn')?.addEventListener('click', () => document.getElementById('confirmModal').style.display = 'none');
    document.querySelectorAll('.close-modal').forEach(btn => btn.addEventListener('click', () => document.getElementById('confirmModal').style.display = 'none'));
    window.onclick = (e) => { if (e.target === document.getElementById('confirmModal')) document.getElementById('confirmModal').style.display = 'none'; };
    document.getElementById('userInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
}

function initTheme() {
    const saved = localStorage.getItem('sioTheme');
    if (saved === 'dark') document.body.classList.add('dark-theme');
    const themeToggle = document.getElementById('themeToggle');
    const themeToggleMobile = document.getElementById('themeToggleMobile');
    if (themeToggle) themeToggle.addEventListener('click', () => { document.body.classList.toggle('dark-theme'); localStorage.setItem('sioTheme', document.body.classList.contains('dark-theme') ? 'dark' : 'light'); });
    if (themeToggleMobile) themeToggleMobile.addEventListener('click', () => { document.body.classList.toggle('dark-theme'); localStorage.setItem('sioTheme', document.body.classList.contains('dark-theme') ? 'dark' : 'light'); document.getElementById('mobileNav')?.classList.remove('active'); });
}

function initBurgerMenu() {
    const burger = document.getElementById('burgerMenu');
    const mobileNav = document.getElementById('mobileNav');
    if (burger && mobileNav) {
        burger.addEventListener('click', () => { burger.classList.toggle('active'); mobileNav.classList.toggle('active'); });
        document.querySelectorAll('.mobile-nav a, .mobile-nav button').forEach(link => {
            link.addEventListener('click', () => { burger.classList.remove('active'); mobileNav.classList.remove('active'); });
        });
    }
}

function initParticles() {
    const canvas = document.getElementById('particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    for (let i = 0; i < 50; i++) {
        particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, radius: Math.random() * 3 + 1, alpha: Math.random() * 0.5 + 0.2 });
    }
    function draw() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let p of particles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(102, 126, 234, ${p.alpha})`;
            ctx.fill();
            p.y -= 0.5;
            if (p.y < 0) p.y = canvas.height;
        }
        requestAnimationFrame(draw);
    }
    draw();
    window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
}

initEventListeners();
initTheme();
initBurgerMenu();
initParticles();
loadChats();
