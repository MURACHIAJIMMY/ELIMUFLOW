const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'school_logos',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const upload = multer({ storage });
module.exports = upload;
