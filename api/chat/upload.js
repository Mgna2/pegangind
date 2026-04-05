/**
 * POST /api/chat/upload
 * Upload a chat attachment (image or zip). Uses Vercel Blob.
 */
const { requireAdminAuth } = require('../../auth');
const { uploadToBlob } = require('../../upload');
const path = require('path');

module.exports = async (req, res) => {
  try {
    const { file, clientId, conversationId } = req.body || {};

    if (!file || !file.data) {
      return res.status(400).json({ success: false, error: 'File data diperlukan' });
    }

    const buffer = Buffer.from(file.data, 'base64');
    const filename = `${Date.now()}-${file.name || 'upload'}`;
    const ext = path.extname(file.name || '').toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const fileType = imageExts.includes(ext) ? 'image' : 'file';

    const filePath = await uploadToBlob(buffer, filename, 'chat');

    return res.json({
      success: true,
      file_path: filePath,
      file_name: file.name || filename,
      file_type: fileType,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
