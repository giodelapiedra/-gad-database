import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

const ALLOWED_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv', // .csv
];

const ALLOWED_EXTS = /\.(xlsx|xls|csv)$/i;

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    const extValid = ALLOWED_EXTS.test(file.originalname);
    const mimeValid = ALLOWED_MIMES.includes(file.mimetype);

    if (extValid && mimeValid) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx, .xls, and .csv files are allowed.'));
    }
  },
});

export function uploadSingle(fieldName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const handler = upload.single(fieldName);

    handler(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          sendError(res, 'File too large. Maximum size is 10MB.', 400);
          return;
        }
        sendError(res, err.message, 400);
        return;
      }

      if (err instanceof Error) {
        sendError(res, err.message, 400);
        return;
      }

      next();
    });
  };
}
