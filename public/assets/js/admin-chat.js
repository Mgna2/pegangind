// Admin Chat Panel — Socket.io client
(function () {
  const socket = io();

  let activeConversationId = null;
  let activeStatus = 'open';
  const conversationsMap = {}; // id -> conv data
  let pendingAttachment = null;

  // ---- Build conversations map from DOM ----
  document.querySelectorAll('.conv-item').forEach(el => {
    const id = parseInt(el.dataset.id);
    conversationsMap[id] = {
      id,
      clientId: el.dataset.clientId,
      status: el.dataset.status,
      name: el.querySelector('.conv-name')?.textContent || '',
    };
  });

  // ---- Elements ----
  const statusEl = document.getElementById('connect-status');
  const convList = document.getElementById('conv-list-container');
  const noConv = document.getElementById('no-conv');
  const threadContent = document.getElementById('thread-content');
  const threadClientName = document.getElementById('thread-client-name');
  const threadClientId = document.getElementById('thread-client-id');
  const messagesArea = document.getElementById('messages-area');
  const threadForm = document.getElementById('thread-form');
  const threadInput = document.getElementById('thread-input');
  const sendBtn = document.getElementById('thread-send');
  const btnClose = document.getElementById('btn-close');
  const btnReopen = document.getElementById('btn-reopen');
  const uploadStatus = document.getElementById('admin-upload-status');
  const attachImageInput = document.getElementById('admin-attach-image');
  const attachFileInput = document.getElementById('admin-attach-file');

  // ---- Socket: connect ----
  socket.on('connect', () => {
    statusEl.textContent = 'Tersambung ✓';
    statusEl.className = 'chat-connect-status connected';
    socket.emit('admin:join');
  });

  socket.on('disconnect', () => {
    statusEl.textContent = 'Terputus...';
    statusEl.className = 'chat-connect-status';
  });

  // ---- Select conversation ----
  convList.addEventListener('click', (e) => {
    const item = e.target.closest('.conv-item');
    if (!item) return;
    selectConversation(parseInt(item.dataset.id));
  });

  function selectConversation(id) {
    document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));
    const item = document.querySelector(`.conv-item[data-id="${id}"]`);
    if (item) item.classList.add('active');

    activeConversationId = id;
    const conv = conversationsMap[id];
    if (!conv) return;
    activeStatus = conv.status;

    threadClientName.textContent = conv.name;
    threadClientId.textContent = conv.clientId;

    btnClose.style.display = activeStatus === 'open' ? 'inline-block' : 'none';
    btnReopen.style.display = activeStatus === 'closed' ? 'inline-block' : 'none';

    noConv.style.display = 'none';
    threadContent.style.display = 'flex';
    messagesArea.innerHTML = '<div class="chat-empty-state"><p>Memuat pesan...</p></div>';

    socket.emit('admin:get_history', { conversationId: id });
  }

  // ---- Send message ----
  function sendAdminMessage(text, attachment) {
    if ((!text || !text.trim()) && !attachment) return;
    socket.emit('admin:message', {
      conversationId: activeConversationId,
      message: text || (attachment ? '[Lampiran: ' + attachment.file_name + ']' : ''),
      attachment: attachment
    });
  }

  threadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = threadInput.value.trim();
    if (!text && !pendingAttachment) return;
    threadInput.value = '';
    sendAdminMessage(text, pendingAttachment);
    pendingAttachment = null;
  });

  // ---- File upload handlers ----
  attachImageInput.addEventListener('change', handleAttachChange('image'));
  attachFileInput.addEventListener('change', handleAttachChange('file'));

  function handleAttachChange(fieldName) {
    return function (e) {
      const file = e.target.files[0];
      if (!file) return;
      uploadAndSend(file, fieldName);
      e.target.value = '';
    };
  }

  function uploadAndSend(file, fieldName) {
    uploadStatus.textContent = '⏳ Mengupload...';
    sendBtn.disabled = true;

    const formData = new FormData();
    formData.append(fieldName, file);

    fetch('/admin/chat/upload', {
      method: 'POST',
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      sendBtn.disabled = false;
      if (data.success) {
        pendingAttachment = {
          file_path: data.file_path,
          file_name: data.file_name,
          file_type: data.file_type
        };
        uploadStatus.textContent = '✅ ' + data.file_name + ' siap dikirim';
        if (!threadInput.value.trim()) {
          threadForm.dispatchEvent(new Event('submit'));
        }
        setTimeout(() => { uploadStatus.textContent = ''; }, 3000);
      } else {
        uploadStatus.textContent = '❌ ' + data.error;
        setTimeout(() => { uploadStatus.textContent = ''; }, 4000);
      }
    })
    .catch(() => {
      sendBtn.disabled = false;
      uploadStatus.textContent = '❌ Gagal upload';
      setTimeout(() => { uploadStatus.textContent = ''; }, 4000);
    });
  }

  // ---- Render messages ----
  function renderMessages(messages) {
    messagesArea.innerHTML = '';
    if (!messages || messages.length === 0) {
      messagesArea.innerHTML = '<div class="chat-empty-state"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>Belum ada pesan di percakapan ini</p></div>';
      return;
    }

    let lastDate = null;
    messages.forEach(msg => {
      const msgDate = new Date(msg.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      if (msgDate !== lastDate) {
        const d = document.createElement('div');
        d.className = 'msg-date';
        d.innerHTML = `<span class="date-divider">${msgDate}</span>`;
        messagesArea.appendChild(d);
        lastDate = msgDate;
      }
      appendMessageBubble(msg);
    });

    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  function appendMessageBubble(message) {
    const div = document.createElement('div');
    div.className = `msg-bubble ${message.sender_type}`;
    const time = new Date(message.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const senderName = message.sender_name || (message.sender_type === 'client' ? 'Client' : 'Admin');

    let html = '';
    if (message.message && message.message.trim()) {
      html += escapeHtml(message.message);
    }
    if (message.file_path) {
      html += renderAttachmentHtml(message);
    }
    html += `<div class="msg-meta">${escapeHtml(senderName)} · ${time}</div>`;

    div.innerHTML = html;
    messagesArea.appendChild(div);
  }

  function renderAttachmentHtml(msg) {
    if (msg.file_type === 'image') {
      return `<div class="msg-attachment"><img src="${msg.file_path}" alt="lampiran" loading="lazy" onclick="window.open(this.src,'_blank')" /></div>`;
    } else {
      return `<div class="msg-attachment"><a href="${msg.file_path}" download="${escapeHtml(msg.file_name)}">` +
        `<span style="font-size:1.1rem;">📦</span>` +
        `<span style="flex:1;word-break:break-all;">${escapeHtml(msg.file_name)}</span>` +
        `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>` +
        `</a></div>`;
    }
  }

  // ---- Close / Reopen conversation ----
  btnClose.addEventListener('click', () => {
    if (!activeConversationId) return;
    socket.emit('admin:close', { conversationId: activeConversationId });
    activeStatus = 'closed';
    btnClose.style.display = 'none';
    btnReopen.style.display = 'inline-block';
    const item = document.querySelector(`.conv-item[data-id="${activeConversationId}"]`);
    if (item) item.classList.add('conv-closed');
  });

  btnReopen.addEventListener('click', () => {
    if (!activeConversationId) return;
    socket.emit('admin:reopen', { conversationId: activeConversationId });
    activeStatus = 'open';
    btnClose.style.display = 'inline-block';
    btnReopen.style.display = 'none';
    const item = document.querySelector(`.conv-item[data-id="${activeConversationId}"]`);
    if (item) item.classList.remove('conv-closed');
  });

  // ---- Socket events ----
  socket.on('chat:history', ({ conversationId, messages }) => {
    if (conversationId === activeConversationId) renderMessages(messages);
  });

  socket.on('chat:new', ({ message, conversationId }) => {
    if (conversationId === activeConversationId) {
      const msgDate = new Date(message.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      const lastDateEl = messagesArea.querySelector('.msg-date:last-child .date-divider');
      const lastDateText = lastDateEl ? lastDateEl.textContent.trim() : null;
      if (!lastDateText || msgDate !== lastDateText) {
        const d = document.createElement('div');
        d.className = 'msg-date';
        d.innerHTML = `<span class="date-divider">${msgDate}</span>`;
        messagesArea.appendChild(d);
      }
      appendMessageBubble(message);
      messagesArea.scrollTop = messagesArea.scrollHeight;

      if (message.sender_type === 'client') {
        socket.emit('admin:get_history', { conversationId: activeConversationId });
      }
    }

    const item = document.querySelector(`.conv-item[data-id="${conversationId}"]`);
    if (item) {
      const preview = item.querySelector('.conv-preview');
      if (preview) preview.textContent = message.message || '[Lampiran]';
      const timeEl = item.querySelector('.conv-time');
      if (timeEl) timeEl.textContent = new Date(message.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
  });

  socket.on('admin:conversations', ({ conversations }) => {
    updateConvList(conversations);
  });

  socket.on('admin:conversation_update', () => {
    socket.emit('admin:join');
  });

  function updateConvList(conversations) {
    const container = document.getElementById('conv-list-container');
    if (!container) return;

    document.getElementById('conv-count').textContent = conversations.length;

    container.innerHTML = conversations.length === 0
      ? '<div style="padding:24px;text-align:center;color:#aaa;font-size:0.85rem;">Belum ada percakapan</div>'
      : '';

    conversations.forEach(conv => {
      conversationsMap[conv.id] = {
        id: conv.id,
        clientId: conv.client_id,
        status: conv.status,
        name: conv.name,
      };

      const div = document.createElement('div');
      div.className = `conv-item${conv.status === 'closed' ? ' conv-closed' : ''}${conv.id === activeConversationId ? ' active' : ''}`;
      div.dataset.id = conv.id;
      div.dataset.clientId = conv.client_id;
      div.dataset.status = conv.status;
      div.innerHTML = `
        <div class="conv-avatar">${conv.name[0].toUpperCase()}</div>
        <div class="conv-info">
          <div class="conv-name">${escapeHtml(conv.name)}</div>
          <div class="conv-preview">${escapeHtml(conv.last_message || 'Belum ada pesan')}</div>
        </div>
        <div class="conv-meta">
          <span class="conv-time">${conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}) : ''}</span>
          ${conv.unread_count > 0 ? `<span class="conv-badge">${conv.unread_count}</span>` : ''}
        </div>
      `;
      div.addEventListener('click', () => selectConversation(conv.id));
      container.appendChild(div);
    });
  }

  function escapeHtml(text) {
    if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }
})();
