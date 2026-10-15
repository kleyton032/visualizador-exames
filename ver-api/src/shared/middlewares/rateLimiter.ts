import rateLimit from 'express-rate-limit';

/** Limita tentativas de login por IP para mitigar força bruta. */
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // 5 tentativas por IP por minuto
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em instantes.' },
});

/** Limita redefinições/trocas de senha por IP. */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 operações por IP por minuto
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas solicitações. Tente novamente em instantes.' },
});
