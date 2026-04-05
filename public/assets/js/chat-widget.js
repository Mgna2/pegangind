// Chat Widget — client-side Socket.io
(function () {
  console.log('[ChatWidget] PEGANGIND_CLIENT_ID:', window.PEGANGIND_CLIENT_ID);
  if (!window.PEGANGIND_CLIENT_ID) return;

  const clientId = window.PEGANGIND_CLIENT_ID;
  const socket = io();

  let currentConversationId = null;
  let isOpen = false;

  // ---- Build UI ----
  const widget = document.createElement('div');
  widget.id = 'chat-widget';
  widget.innerHTML = `
    <button id="chat-toggle" title="Live Chat dengan Admin">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <span>Chat</span>
    </button>
    <div id="chat-panel">
      <div id="chat-header">
        <strong>💬 Live Chat — Admin</strong>
        <div style="display:flex;gap:8px;align-items:center;">
          <span id="chat-status" style="font-size:0.7rem;font-weight:400;opacity:0.8;">Menghubungkan...</span>
          <button id="chat-close" style="background:none;border:none;color:white;cursor:pointer;font-size:1.1rem;line-height:1;">×</button>
        </div>
      </div>
      <div id="chat-messages">
        <div class="chat-empty">Memuat riwayat chat...</div>
      </div>
      <form id="chat-form">
        <input id="chat-input" placeholder="Ketik pesan..." autocomplete="off" />
        <button type="submit" id="chat-send">Kirim</button>
      </form>
    </div>
  `;
  document.body.appendChild(widget);

  // ---- Styles ----
  const style = document.createElement('style');
  style.textContent = `
    #chat-widget {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      font-family: 'Inter', sans-serif;
    }
    #chat-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #124875;
      color: white;
      border: none;
      border-radius: 28px;
      padding: 12px 20px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(18,72,117,0.4);
      transition: transform 0.2s;
    }
    #chat-toggle:hover { transform: scale(1.05); }
    #chat-panel {
      position: absolute;
      bottom: 56px;
      right: 0;
      width: 340px;
      height: 460px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #eee;
    }
    #chat-header {
      background: #124875;
      color: white;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
    }
    #chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .chat-empty { color: #999; text-align: center; margin-top: 20px; font-size: 0.8rem; }
    .chat-msg { max-width: 80%; padding: 8px 12px; border-radius: 12px; font-size: 0.85rem; line-height: 1.4; word-break: break-word; }
    .chat-msg.client { align-self: flex-end; background: #124875; color: white; border-bottom-right-radius: 4px; }
    .chat-msg.admin { align-self: flex-start; background: #e8f0fe; color: #1a1a2e; border-bottom-left-radius: 4px; }
    .chat-msg-time { font-size: 0.65rem; opacity: 0.7; margin-top: 4px; display: block; }
    #chat-form {
      display: flex;
      border-top: 1px solid #eee;
      padding: 10px;
      gap: 8px;
      background: white;
    }
    #chat-input {
      flex: 1;
      border: 1px solid #ddd;
      border-radius: 20px;
      padding: 8px 14px;
      font-size: 0.875rem;
      outline: none;
      font-family: inherit;
    }
    #chat-input:focus { border-color: #124875; }
    #chat-send {
      background: #124875;
      color: white;
      border: none;
      border-radius: 20px;
      padding: 8px 16px;
      font-size: 0.85rem;
      cursor: pointer;
      font-weight: 600;
    }
    @media (max-width: 400px) {
      #chat-panel { width: 300px; height: 420px; right: -10px; }
    }
  `;
  document.head.appendChild(style);

  // ---- Elements ----
  const toggleBtn = document.getElementById('chat-toggle');
  const panel = document.getElementById('chat-panel');
  const messagesEl = document.getElementById('chat-messages');
  const statusEl = document.getElementById('chat-status');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const closeBtn = document.getElementById('chat-close');

  // ---- Toggle panel ----
  toggleBtn.addEventListener('click', () => {
    isOpen = !isOpen;
    panel.style.display = isOpen ? 'flex' : 'none';
    toggleBtn.style.display = isOpen ? 'none' : 'flex';
    if (isOpen) {
      chatInput.focus();
      if (currentConversationId) socket.emit('client:join', { clientId });
    }
  });

  closeBtn.addEventListener('click', () => {
    isOpen = false;
    panel.style.display = 'none';
    toggleBtn.style.display = 'flex';
  });

  // ---- Send message ----
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    socket.emit('client:message', { message: text });
  });

  // ---- Socket events ----
  socket.on('connect', () => {
    statusEl.textContent = 'Tersambung ✓';
    socket.emit('client:join', { clientId });
  });

  socket.on('disconnect', () => {
    statusEl.textContent = 'Terputus, menghubungkan ulang...';
  });

  socket.on('chat:history', ({ conversationId, messages }) => {
    currentConversationId = conversationId;
    messagesEl.innerHTML = '';
    if (messages.length === 0) {
      messagesEl.innerHTML = '<div class="chat-empty">Belum ada pesan. Mulai chat dengan admin sekarang!</div>';
      return;
    }
    messages.forEach(renderMessage);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });

  socket.on('chat:new', ({ message }) => {
    currentConversationId = message.conversation_id;
    renderMessage(message);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });

  function renderMessage(msg) {
    // Remove empty state
    const empty = messagesEl.querySelector('.chat-empty');
    if (empty) empty.remove();

    const div = document.createElement('div');
    div.className = `chat-msg ${msg.sender_type}`;
    const time = msg.created_at ? new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
    div.innerHTML = `<span>${escapeHtml(msg.message)}</span><span class="chat-msg-time">${msg.sender_name} · ${time}</span>`;
    messagesEl.appendChild(div);
  }

  function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }
})();
