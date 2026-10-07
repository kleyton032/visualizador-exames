import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { loginLimiter } from '../../shared/middlewares/rateLimiter';
import { requireRole } from '../../shared/middlewares/rbac.middleware';

const router = Router();
const controller = new AuthController();

router.post('/login', loginLimiter, controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
router.post('/logout-all', authMiddleware, controller.logoutAll);
router.get('/me', authMiddleware, controller.me);
router.post('/users', authMiddleware, requireRole('ADMIN'), controller.createUser);

// Rotas de Recuperação de Senha
router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password', controller.resetPassword);

export default router;
