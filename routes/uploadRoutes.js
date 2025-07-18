const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');

router.post('/upload', upload.single('file'), (req, res) => {
  res.json({ message: 'File uploaded successfully!', file: req.file });
});

module.exports = router;
