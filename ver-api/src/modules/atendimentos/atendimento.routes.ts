import { Router } from 'express';
import { AtendimentoController } from './atendimento.controller';
const router = Router();
const controller = new AtendimentoController();
router.get('/', controller.getToday);
export default router;
