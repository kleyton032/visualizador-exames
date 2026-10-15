import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from '../errors/AppError';

/** Tratamento central de erros da API. */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(err);
  }

  // Erros de upload (multer)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Arquivo excede o limite de 80 MB', code: 'FILE_TOO_LARGE' });
    }
    return res.status(400).json({ error: err.message, code: 'UPLOAD_ERROR' });
  }

  // Erros de aplicação mapeados (status + código estáveis).
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, code: err.code });
  }

  // Erros de validação de body (express.json) — não vazam detalhes internos.
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido na requisição.', code: 'BAD_JSON' });
  }

  // Erro desconhecido: loga internamente e retorna resposta genérica.
  console.error('Erro não tratado:', err);
  const status = typeof err?.statusCode === 'number' ? err.statusCode : 500;
  const message = status >= 500
    ? 'Erro interno do servidor.'
    : (err?.message || 'Erro interno do servidor.');
  return res.status(status).json({ error: message, code: status >= 500 ? 'INTERNAL_ERROR' : 'ERROR' });
}
