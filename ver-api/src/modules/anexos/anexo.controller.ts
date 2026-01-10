import { Request, Response } from 'express';
import { AnexoService } from './anexo.service';

export class AnexoController {
  private service = new AnexoService();

  listExames = async (req: Request, res: Response) => {
    const exames = await this.service.listExames();
    res.json(exames);
  };


  upload = async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { cd_paciente, cd_atendimento, id_exame, data, olho, observacoes, status } = req.body;

    await this.service.upload(req.file, {
      cd_paciente: Number(cd_paciente),
      cd_atendimento: Number(cd_atendimento),
      id_exame: Number(id_exame),
      data: data,
      olho: olho,
      observacoes: observacoes,
      status: status
    });

    res.status(201).send();
  };
}
