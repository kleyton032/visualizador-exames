import rateLimit from 'express-rate-limit';

/** Limita tentativas de login por IP para mitigar força bruta. */
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // 5 tentativas por IP por minuto
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em instantes.' },
});
