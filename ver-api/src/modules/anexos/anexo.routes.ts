import { Router } from 'express';
import { AnexoController } from './anexo.controller';
const router = Router();
const controller = new AnexoController();
router.post('/', controller.create);
export default router;
