import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Ensure upload directories exist
const uploadBaseDir = path.join(process.cwd(), 'uploads');
const venuesDir = path.join(uploadBaseDir, 'venues');
const avatarsDir = path.join(uploadBaseDir, 'avatars');

[uploadBaseDir, venuesDir, avatarsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    if (req.baseUrl.includes('venues') || req.path.includes('venues')) {
      cb(null, venuesDir);
    } else {
      cb(null, avatarsDir);
    }
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مدعوم، يرجى رفع صور فقط بصيغ (JPEG, PNG, WEBP)'));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter,
});

export const uploadVenueImages = upload.array('images', 8);
export const uploadAvatar = upload.single('avatar');

