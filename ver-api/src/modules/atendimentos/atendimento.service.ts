import { AtendimentoRepository } from './atendimento.repository';

export class AtendimentoService {
  private repo = new AtendimentoRepository();
  async create(pacienteId: number) {
    await this.repo.create(pacienteId);
  }
}
