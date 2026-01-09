import { Request, Response } from 'express';
import { AtendimentoService } from './atendimento.service';

export class AtendimentoController {
  private service = new AtendimentoService();
  create = async (req: Request, res: Response) => {
    await this.service.create(req.body.pacienteId);
    res.status(201).send();
  };
}
