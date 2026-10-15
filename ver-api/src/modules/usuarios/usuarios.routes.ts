import { Router } from 'express';
import { UsuariosController } from './usuarios.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { requireRole } from '../../shared/middlewares/rbac.middleware';
import { passwordResetLimiter } from '../../shared/middlewares/rateLimiter';

const router = Router();
const controller = new UsuariosController();

// Todas as rotas do módulo exigem autenticação e perfil ADMIN.
router.use(authMiddleware, requireRole('ADMIN'));

router.get('/', controller.listar);
router.get('/:id', controller.detalhar);
router.patch('/:id', controller.atualizar);
router.post('/:id/redefinir-senha', passwordResetLimiter, controller.redefinirSenha);
router.get('/:id/auditoria', controller.auditoria);

export default router;
