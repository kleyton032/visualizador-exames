import { AtendimentoRepository } from './atendimento.repository';

export class AtendimentoService {
  private repo = new AtendimentoRepository();

  async getTodayAppointments(nmPaciente?: string, cdPaciente?: number) {
    return this.repo.findByPatientToday({ nm_paciente: nmPaciente, cd_paciente: cdPaciente });
  }
}
