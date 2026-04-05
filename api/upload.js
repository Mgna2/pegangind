/**
 * Vercel Blob upload utility.
 * Replaces multer disk storage with cloud storage.
 *
 * In local dev (non-VERCEL), falls back to writing to public/uploads/
 */
const { put } = require('@vercel/blob');
const path = require('path');
const fs = require('fs');

const isProd = process.env.VERCEL === 'true';

async function uploadToBlob(buffer, filename, folder) {
  if (!isProd) {
    // Local dev: write to public/uploads/{folder}/
    const dir = path.join(process.cwd(), 'public', 'uploads', folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, buffer);
    return `/uploads/${folder}/${filename}`;
  }

  // Production: upload to Vercel Blob
  const blob = await put(`uploads/${folder}/${filename}`, buffer, {
    contentType: 'application/octet-stream',
    access: 'public',
  });
  return blob.url;
}

module.exports = { uploadToBlob };
