import { Router } from 'express';
import { AtendimentoController } from './atendimento.controller';
import { requireRole } from '../../shared/middlewares/rbac.middleware';

const router = Router();
const controller = new AtendimentoController();

// Médicos (autocadastro) não acessam atendimentos — somente consulta de exames.
router.get('/', requireRole('ADMIN', 'OPERADOR', 'VISUALIZADOR'), controller.getToday);

export default router;
