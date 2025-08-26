const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), process.env.UPLOAD_PATH || 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.shp', '.dbf', '.shx', '.prj', '.cpg', '.sbn', '.sbx'];
  const extension = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(extension)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Only shapefile components are allowed: ${allowedExtensions.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || (2 * 1024 * 1024 * 1024), // 2 GB
    files: parseInt(process.env.MAX_FILES, 10) || 15
  }
});

module.exports = upload;
