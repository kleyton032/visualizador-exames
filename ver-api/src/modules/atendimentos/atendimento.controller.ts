import { Request, Response } from 'express';
import { AtendimentoService } from './atendimento.service';

export class AtendimentoController {
  private service = new AtendimentoService();

  getToday = async (req: Request, res: Response) => {
    const { nm_paciente, cd_paciente } = req.query;

    console.log('--- Debug Controller ---');
    console.log('Query Params:', req.query);

    const appointments = await this.service.getTodayAppointments(
      nm_paciente as string,
      cd_paciente ? Number(cd_paciente) : undefined
    );

    res.json(appointments);
  };
}
