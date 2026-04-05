const { syncGet, syncAll, syncRun } = require('../db/index');
const { authMap } = require('./authMap');

module.exports = (io) => {

  const getOrCreateConversation = (clientId) => {
    let conv = syncGet(
      'SELECT * FROM chat_conversations WHERE client_id = ? AND status = ?',
      [clientId, 'open']
    );

    if (!conv) {
      const result = syncRun(
        'INSERT INTO chat_conversations (client_id, status) VALUES (?, ?)',
        [clientId, 'open']
      );
      conv = syncGet('SELECT * FROM chat_conversations WHERE id = ?', [result.lastInsertRowid]);
    }
    return conv;
  };

  const saveMessage = (conversationId, senderType, senderId, message, attachment) => {
    const filePath = attachment ? attachment.file_path : null;
    const fileName = attachment ? attachment.file_name : null;
    const fileType = attachment ? attachment.file_type : null;

    const result = syncRun(
      'INSERT INTO chat_messages (conversation_id, sender_type, sender_id, message, file_path, file_name, file_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [conversationId, senderType, senderId, message, filePath, fileName, fileType]
    );

    syncRun('UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [conversationId]);

    return syncGet('SELECT * FROM chat_messages WHERE id = ?', [result.lastInsertRowid]);
  };

  io.on('connection', (socket) => {
    const clientIdentity = authMap.get(socket.id) || {};
    let currentClientId = clientIdentity.clientId;

    socket.on('client:join', ({ clientId }) => {
      if (!clientId) return;
      const client = syncGet('SELECT id, name FROM clients WHERE id = ? AND verified = 1', [clientId]);
      if (!client) return;

      currentClientId = clientId;
      authMap.set(socket.id, { clientId, isAdmin: false });
      socket.join(`client:${clientId}`);

      const conv = syncGet('SELECT * FROM chat_conversations WHERE client_id = ? ORDER BY updated_at DESC LIMIT 1', [clientId]);
      if (conv) {
        const messages = syncAll(
          'SELECT cm.*, c.name as sender_name FROM chat_messages cm LEFT JOIN clients c ON cm.sender_type = \'client\' AND cm.sender_id = c.id WHERE cm.conversation_id = ? ORDER BY cm.created_at ASC',
          [conv.id]
        );
        socket.emit('chat:history', { conversationId: conv.id, messages });
      }

      io.to('admin').emit('admin:conversation_update');
    });

    socket.on('admin:join', () => {
      authMap.set(socket.id, { isAdmin: true });
      socket.join('admin');
      const conversations = syncAll(`
        SELECT cc.*, c.name, c.email,
          (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = cc.id AND sender_type = 'client' AND read_at IS NULL) as unread_count,
          (SELECT message FROM chat_messages WHERE conversation_id = cc.id ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT created_at FROM chat_messages WHERE conversation_id = cc.id ORDER BY created_at DESC LIMIT 1) as last_message_at
        FROM chat_conversations cc
        JOIN clients c ON cc.client_id = c.id
        WHERE cc.status = 'open'
        ORDER BY cc.updated_at DESC
      `);
      socket.emit('admin:conversations', { conversations });
    });

    socket.on('client:message', ({ message, attachment }) => {
      if (!currentClientId || !message || !message.trim()) return;

      const conv = getOrCreateConversation(currentClientId);
      const msg = saveMessage(conv.id, 'client', currentClientId, message.trim(), attachment);

      const client = syncGet('SELECT name FROM clients WHERE id = ?', [currentClientId]);
      msg.sender_name = client ? client.name : 'Client';

      io.to(`client:${currentClientId}`).emit('chat:new', { message: msg, conversationId: conv.id });
      io.to('admin').emit('chat:new', { message: msg, conversationId: conv.id });
      io.to('admin').emit('admin:conversation_update');
    });

    socket.on('admin:message', ({ conversationId, message, attachment }) => {
      const identity = authMap.get(socket.id);
      if (!identity || !identity.isAdmin) return;
      if (!conversationId || !message || !message.trim()) return;

      const conv = syncGet('SELECT * FROM chat_conversations WHERE id = ?', [conversationId]);
      if (!conv || conv.status !== 'open') return;

      const adminId = 1;
      const msg = saveMessage(conversationId, 'admin', adminId, message.trim(), attachment);
      msg.sender_name = 'Admin';

      syncRun(
        'UPDATE chat_messages SET read_at = CURRENT_TIMESTAMP WHERE conversation_id = ? AND sender_type = ? AND read_at IS NULL',
        [conversationId, 'client']
      );

      io.to(`client:${conv.client_id}`).emit('chat:new', { message: msg, conversationId });
      io.to('admin').emit('chat:new', { message: msg, conversationId });
      io.to('admin').emit('admin:conversation_update');
    });

    socket.on('admin:get_history', ({ conversationId }) => {
      const identity = authMap.get(socket.id);
      if (!identity || !identity.isAdmin) return;

      const conv = syncGet('SELECT * FROM chat_conversations WHERE id = ?', [conversationId]);
      if (!conv) return;

      const messages = syncAll(
        'SELECT cm.*, c.name as sender_name FROM chat_messages cm LEFT JOIN clients c ON cm.sender_type = \'client\' AND cm.sender_id = c.id WHERE cm.conversation_id = ? ORDER BY cm.created_at ASC',
        [conversationId]
      );

      syncRun(
        'UPDATE chat_messages SET read_at = CURRENT_TIMESTAMP WHERE conversation_id = ? AND sender_type = ? AND read_at IS NULL',
        [conversationId, 'client']
      );

      socket.emit('chat:history', { conversationId, messages });
      io.to('admin').emit('admin:conversation_update');
    });

    socket.on('admin:close', ({ conversationId }) => {
      const identity = authMap.get(socket.id);
      if (!identity || !identity.isAdmin) return;
      syncRun('UPDATE chat_conversations SET status = ? WHERE id = ?', ['closed', conversationId]);
      io.to('admin').emit('admin:conversation_update');
    });

    socket.on('admin:reopen', ({ conversationId }) => {
      const identity = authMap.get(socket.id);
      if (!identity || !identity.isAdmin) return;
      syncRun('UPDATE chat_conversations SET status = ? WHERE id = ?', ['open', conversationId]);
      io.to('admin').emit('admin:conversation_update');
    });

    socket.on('disconnect', () => {
      authMap.delete(socket.id);
    });
  });
};
