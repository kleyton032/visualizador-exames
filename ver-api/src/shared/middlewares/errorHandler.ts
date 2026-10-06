import { NextFunction, Request, Response } from 'express';

/** Tratamento central de erros da API. */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(err);
  }

  console.error('Erro não tratado:', err);
  const status = err.statusCode || err.status || 500;
  return res.status(status).json({ error: err.message || 'Erro interno do servidor' });
}
