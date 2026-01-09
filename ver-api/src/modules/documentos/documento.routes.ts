import { Router } from 'express';
import { DocumentoController } from './documento.controller';
const router = Router();
const controller = new DocumentoController();
router.post('/', controller.create);
export default router;
