import express from 'express';
import multer from 'multer';
import controller from './controller';
import { tmpdir } from 'os';
import { CommonError } from '../../../common/error';

const supportMimeTypes = [
  'text/csv',
  'text/plain',
  'application/ocete-stream',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const upload = multer({
  dest: tmpdir(),
  fileFilter(_req, file, callback) {
    // csv file just a plain text with special format, cannot filter by
    // mimetype or file suffix. Here just filtering most with unsupport files.
    if (
      !file.originalname.toLowerCase().endsWith('.csv') &&
      !file.originalname.toLowerCase().endsWith('.xlsx') &&
      !supportMimeTypes.includes(file.mimetype)
    ) {
      return callback(new CommonError('Unsupport file type.', 400));
    }

    callback(null, true);
  },
  limits: {
    files: 1,
    fileSize: 1 << 20, // 1MB
  },
}).single('products');

export default express.Router().post('/import', upload, controller.import);
