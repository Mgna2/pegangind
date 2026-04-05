/**
 * POST /api/admin/upload
 * Generic file upload for orders and portfolio. Accepts JSON with base64-encoded file.
 *
 * Body (JSON): {
 *   folder: 'orders' | 'portfolio' | 'chat',
 *   name: original filename,
 *   data: base64 string
 * }
 */
const { requireAdminAuth } = require('../../auth');
const { uploadToBlob } = require('../../upload');
const path = require('path');
const crypto = require('crypto');

module.exports = async (req, res) => {
  const auth = requireAdminAuth(req);
  if (!auth) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const { folder, name, data } = req.body || {};

    if (!data) return res.status(400).json({ success: false, error: 'File data diperlukan' });

    const buffer = Buffer.from(data, 'base64');
    const ext = path.extname(name || '.jpg').toLowerCase();
    const safeName = `${crypto.randomUUID()}${ext}`;
    const filePath = await uploadToBlob(buffer, safeName, folder || 'misc');

    return res.json({ success: true, file_path: filePath, file_name: name || safeName });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
