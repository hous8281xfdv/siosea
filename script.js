const STORAGE_KEY = 'sio_chats';
let currentChatId = null;
let chats = [];

const API_URL = 'https://api.airforce/v1/chat/completions';
const API_KEY = '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';

async function getAIResponse(userMessage) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek-v3',
                messages: [{ role: 'user', content: userMessage }],
                max_tokens: 1000,
                temperature: 0.8
            })
        });
        const data = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
        }
        return smartFallback(userMessage);
    } catch (error) {
        console.error('API error:', error);
        return smartFallback(userMessage);
    }
}

function smartFallback(userMessage) {
    const msg = userMessage.toLowerCase();
    if (msg.includes('привет')) return 'Привет! Я Sio. Чем могу помочь?';
    if (msg.includes('как дела')) return 'У меня всё отлично! А у тебя?';
    if (msg.includes('спасибо')) return 'Пожалуйста! Обращайся ещё.';
    if (msg.includes('олицетворение')) return 'Олицетворение — литературный приём, когда неодушевлённому предмету приписываются свойства живого. Пример: "ветер воет", "солнце смеётся".';
    if (msg.includes('стих')) return 'Вот стих:\n\nЗа окном шумит листва,\nОсень тихою стопой\nКрасит желтым города,\nУкрывая нас с тобой.';
    if (msg.includes('сколько будет') || msg.includes('посчитай')) {
        const nums = userMessage.match(/\d+/g);
        if (nums && nums.length >= 2) {
            const result = nums.reduce((a, b) => Number(a) + Number(b), 0);
            return `${userMessage} = ${result}`;
        }
    }
    return `🤖 Sio AI отвечает: "${userMessage.substring(0, 100)}"\n\nЗадайте более конкретный вопрос, и я постараюсь помочь.`;
}

function loadChats() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        chats = JSON.parse(saved);
        if (chats.length === 0) createNewChat();
        else {
            currentChatId = chats[0].id;
            renderHistory();
            loadChat(currentChatId);
        }
    } else createNewChat();
}

function saveChats() { localStorage.setItem(STORAGE_KEY, JSON.stringify(chats)); }

function createNewChat() {
    const newChat = {
        id: Date.now(),
        title: 'Новый чат',
        messages: [{ role: 'ai', text: 'Привет! Я Sio — искусственный интеллект на основе DeepSeek. Задай мне любой вопрос, и я постараюсь ответить как можно точнее. Чем могу помочь?', time: new Date().toLocaleTimeString() }],
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
    if (chats.length === 0) { container.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">Нет диалогов</div>'; return; }
    container.innerHTML = chats.map(chat => `
        <div class="history-item ${chat.id == currentChatId ? 'active' : ''}" data-id="${chat.id}">
            <span class="history-item-title">${escapeHtml(chat.title)}</span>
            <button class="history-item-delete" data-id="${chat.id}"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
    document.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('history-item-delete') || e.target.closest('.history-item-delete')) return;
            loadChat(parseInt(item.dataset.id));
        });
    });
    document.querySelectorAll('.history-item-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(parseInt(btn.dataset.id));
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
        if (chats.length === 0) createNewChat();
        else {
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

function addMessage(chatId, role, text, isTyping = false) {
    const chat = chats.find(c => c.id == chatId);
    if (chat) {
        if (!isTyping) {
            chat.messages.push({ role, text, time: new Date().toLocaleTimeString() });
            saveChats();
            if (role === 'user') updateChatTitle(chatId);
        }
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
            <div class="typing-dots"><span></span><span></span><span></span></div>
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
        chat.messages = [{ role: 'ai', text: 'Привет! Я Sio — искусственный интеллект на основе DeepSeek. Задай мне любой вопрос, и я постараюсь ответить как можно точнее. Чем могу помочь?', time: new Date().toLocaleTimeString() }];
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
        document.querySelectorAll('.mobile-nav a, .mobile-nav button').forEach(link => { link.addEventListener('click', () => { burger.classList.remove('active'); mobileNav.classList.remove('active'); }); });
    }
}

function initParticles() {
    const canvas = document.getElementById('particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    for (let i = 0; i < 50; i++) particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, radius: Math.random() * 3 + 1, alpha: Math.random() * 0.5 + 0.2 });
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
