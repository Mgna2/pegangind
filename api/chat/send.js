/**
 * POST /api/chat/send
 * Send a chat message (replaces Socket.io 'client:message' / 'admin:message').
 *
 * Body: { message, clientId }          — client sends
 * Body: { message, conversationId }    — admin sends
 */
const { requireAdminAuth } = require('../auth');
const { get: dbGet, run: dbRun } = require('../db');

async function getOrCreateConversation(clientId) {
  let conv = await dbGet(
    'SELECT * FROM chat_conversations WHERE client_id = ? AND status = ?',
    [clientId, 'open']
  );
  if (!conv) {
    const result = await dbRun(
      'INSERT INTO chat_conversations (client_id, status) VALUES (?, ?)',
      [clientId, 'open']
    );
    conv = await dbGet('SELECT * FROM chat_conversations WHERE id = ?', [result.lastInsertRowid]);
  }
  return conv;
}

async function saveMessage(conversationId, senderType, senderId, message, attachment = null) {
  const result = await dbRun(
    `INSERT INTO chat_messages (conversation_id, sender_type, sender_id, message, file_path, file_name, file_type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [conversationId, senderType, senderId, message, attachment?.file_path || null, attachment?.file_name || null, attachment?.file_type || null]
  );
  await dbRun('UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [conversationId]);
  return dbGet('SELECT * FROM chat_messages WHERE id = ?', [result.lastInsertRowid]);
}

module.exports = async (req, res) => {
  const { message, clientId, conversationId, attachment } = req.body || {};

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }

  // Admin sending
  if (conversationId) {
    const auth = requireAdminAuth(req);
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });

    const conv = await dbGet('SELECT * FROM chat_conversations WHERE id = ?', [conversationId]);
    if (!conv || conv.status !== 'open') {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const msg = await saveMessage(conversationId, 'admin', 1, message.trim(), attachment);

    // Mark client messages as read
    await dbRun(
      'UPDATE chat_messages SET read_at = CURRENT_TIMESTAMP WHERE conversation_id = ? AND sender_type = ? AND read_at IS NULL',
      [conversationId, 'client']
    );

    return res.json({ success: true, message: { ...msg, sender_name: 'Admin' }, conversationId });
  }

  // Client sending
  if (!clientId) {
    return res.status(400).json({ success: false, error: 'clientId diperlukan' });
  }

  const conv = await getOrCreateConversation(parseInt(clientId));
  const msg = await saveMessage(conv.id, 'client', parseInt(clientId), message.trim(), attachment);

  const client = await dbGet('SELECT name FROM clients WHERE id = ?', [clientId]);
  return res.json({ success: true, message: { ...msg, sender_name: client?.name || 'Client' }, conversationId: conv.id });
};
