import { Router } from 'express';
import { PacienteController } from './paciente.controller';

const router = Router();
const controller = new PacienteController();

router.get('/', controller.list);

export default router;
