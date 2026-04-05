const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const storage = (dest) => multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../public/uploads', dest));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) cb(null, true);
  else cb(new Error('Only image files are allowed'));
};

const uploadOrders = multer({ storage: storage('orders'), fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadPortfolio = multer({ storage: storage('portfolio'), fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// Chat file uploads — single handler that auto-detects image or zip
const chatAnyFilter = (req, file, cb) => {
  const imgAllowed = /jpeg|jpg|png|gif|webp/;
  const fileAllowed = /zip|rar|7z/;
  const ext = path.extname(file.originalname).toLowerCase();

  if (imgAllowed.test(ext) || imgAllowed.test(file.mimetype)) {
    return cb(null, true);
  }
  if (fileAllowed.test(ext)) {
    return cb(null, true);
  }
  cb(new Error('File tidak diizinkan. Hanya gambar (jpg, png, gif, webp) atau ZIP.'));
};

const uploadChat = multer({
  storage: storage('chat'),
  fileFilter: chatAnyFilter,
  limits: { fileSize: 50 * 1024 * 1024 }
});

module.exports = { uploadOrders, uploadPortfolio, uploadChat };
