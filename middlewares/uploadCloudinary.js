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

const upload = multer({ storage });

module.exports = upload;
