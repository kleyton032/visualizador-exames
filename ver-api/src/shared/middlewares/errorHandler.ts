import { NextFunction, Request, Response } from 'express';
import multer from 'multer';

/** Tratamento central de erros da API. */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(err);
  }

  // Erros de upload (multer)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Arquivo excede o limite de 80 MB' });
    }
    return res.status(400).json({ error: err.message });
  }

  console.error('Erro não tratado:', err);
  const status = err.statusCode || err.status || 500;
  return res.status(status).json({ error: err.message || 'Erro interno do servidor' });
}
