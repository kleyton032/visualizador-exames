import { Router } from 'express';
import multer from 'multer';
import { AnexoController } from './anexo.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { requireRole } from '../../shared/middlewares/rbac.middleware';

const router = Router();
const upload = multer({ dest: 'uploads/' });
const controller = new AnexoController();

// Autenticação antes do multer, para não gravar arquivos de requests não autenticados.
router.post('/upload', authMiddleware, requireRole('ADMIN', 'OPERADOR'), upload.single('file'), controller.upload);
router.get('/exames', authMiddleware, controller.listExames);
router.get('/view/:id', authMiddleware, controller.view);
router.patch('/status/:id', authMiddleware, requireRole('ADMIN', 'OPERADOR'), controller.updateStatus);

export default router;
