import { Router } from 'express';
import { MedicoController } from './medico.controller';
import { medicoCadastroLimiter } from '../../shared/middlewares/rateLimiter';

const router = Router();
const controller = new MedicoController();

// Rotas públicas do autocadastro de médicos (validação contra o Oracle MV).
router.post('/iniciar-cadastro', medicoCadastroLimiter, controller.iniciarCadastro);
router.post('/enviar-codigo-email', medicoCadastroLimiter, controller.enviarCodigoEmail);
router.post('/concluir-cadastro', medicoCadastroLimiter, controller.concluirCadastro);

export default router;
