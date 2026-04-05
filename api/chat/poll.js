/**
 * GET /api/chat/poll?conversationId=X
 * Client-side polling to replace Socket.io for real-time chat.
 */
const { requireAdminAuth } = require('../auth');
const { all: dbAll, get: dbGet } = require('../db');

async function handleClientPoll(req, res) {
  // Client poll: requires clientId from query
  const { clientId, since } = req.query;
  if (!clientId) return res.status(400).json({ error: 'clientId diperlukan' });

  const conv = await dbGet(
    'SELECT * FROM chat_conversations WHERE client_id = ? AND status = ?',
    [clientId, 'open']
  );
  if (!conv) return res.json({ success: true, messages: [], conversationId: null });

  let query = 'SELECT cm.*, c.name as sender_name FROM chat_messages cm LEFT JOIN clients c ON cm.sender_type = ? AND cm.sender_id = c.id WHERE cm.conversation_id = ?';
  const params = ['client', conv.id];

  if (since) {
    query += ' AND cm.created_at > ?';
    params.push(since);
  }
  query += ' ORDER BY cm.created_at ASC';

  const messages = await dbAll(query, params);
  return res.json({ success: true, messages, conversationId: conv.id });
}

async function handleAdminPoll(req, res) {
  // Admin poll: all open conversations
  const auth = requireAdminAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });

  const conversations = await dbAll(`
    SELECT cc.*, c.name, c.email, c.client_id,
      (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = cc.id AND sender_type = 'client' AND read_at IS NULL) as unread_count,
      (SELECT message FROM chat_messages WHERE conversation_id = cc.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM chat_messages WHERE conversation_id = cc.id ORDER BY created_at DESC LIMIT 1) as last_message_at
    FROM chat_conversations cc
    JOIN clients c ON cc.client_id = c.id
    WHERE cc.status = 'open'
    ORDER BY cc.updated_at DESC
  `);

  return res.json({ success: true, conversations });
}

module.exports = async (req, res) => {
  const isAdmin = req.query.admin === '1';
  if (isAdmin) return handleAdminPoll(req, res);
  return handleClientPoll(req, res);
};
