import { Request, Response } from 'express';
import { AnexoService } from './anexo.service';

export class AnexoController {
  private service = new AnexoService();
  create = async (req: Request, res: Response) => {
    await this.service.create(req.body.documentoId, req.body.nomeArquivo);
    res.status(201).send();
  };
}
