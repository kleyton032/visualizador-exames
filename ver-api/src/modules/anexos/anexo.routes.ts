import { Router } from 'express';
import multer from 'multer';
import { AnexoController } from './anexo.controller';

const router = Router();
const upload = multer({ dest: 'uploads/' });
const controller = new AnexoController();

router.post('/upload', upload.single('file'), controller.upload);
router.get('/exames', controller.listExames);
router.get('/view/:id', controller.view);
router.patch('/status/:id', controller.updateStatus);

export default router;
