const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: 'uploads/', // sementara simpan lokal dulu
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${file.originalname}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.pdf', '.doc', '.docx', '.ppt', '.pptx'].includes(ext)) {
      return cb(new Error('File type not allowed'));
    }
    cb(null, true);
  },
});

module.exports = upload;
