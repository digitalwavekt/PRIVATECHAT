const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const supabase = require('../services/supabase');
const { authMiddleware } = require('../middleware/auth');

const MAX_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg','image/png','image/gif','image/webp',
      'video/mp4','video/webm','video/quicktime',
      'audio/mpeg','audio/mp4','audio/ogg','audio/wav','audio/webm',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip','text/plain'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  }
});

// Determine bucket by mime type
const getBucket = (mimeType) => {
  if (mimeType.startsWith('audio/')) return 'audio-msgs';
  if (mimeType.startsWith('image/') || mimeType.startsWith('video/')) return 'chat-media';
  return 'chat-media';
};

// POST /api/media/upload — Upload file to Supabase Storage
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const file     = req.file;
    const bucket   = getBucket(file.mimetype);
    const ext      = file.originalname.split('.').pop();
    const fileName = `${req.userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file.buffer, {
        contentType:  file.mimetype,
        cacheControl: '3600',
        upsert:       false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    res.json({
      url:       publicUrl,
      file_name: file.originalname,
      file_size: file.size,
      file_mime: file.mimetype,
      bucket
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/media/avatar — Upload avatar (user or group)
router.post('/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const file     = req.file;
    const ext      = file.originalname.split('.').pop();
    const fileName = `${req.userId}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    // Update user avatar
    await supabase.from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', req.userId);

    res.json({ url: publicUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
