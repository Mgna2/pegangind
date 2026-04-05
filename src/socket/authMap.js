// Maps socket.id -> { clientId, isAdmin }
// Used by chatHandler to identify who is sending messages
const authMap = new Map();

module.exports = { authMap };
