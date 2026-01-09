import { Router } from 'express';
import { AtendimentoController } from './atendimento.controller';
const router = Router();
const controller = new AtendimentoController();
router.post('/', controller.create);
export default router;
