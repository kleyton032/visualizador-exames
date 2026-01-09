import { Request, Response } from 'express';
import { DocumentoService } from './documento.service';

export class DocumentoController {
  private service = new DocumentoService();
  create = async (req: Request, res: Response) => {
    await this.service.create(req.body.atendimentoId, req.body.tipo);
    res.status(201).send();
  };
}
