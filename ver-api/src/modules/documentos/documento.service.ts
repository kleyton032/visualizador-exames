import { DocumentoRepository } from './documento.repository';

export class DocumentoService {
  private repo = new DocumentoRepository();
  async create(atendimentoId: number, tipo: string) {
    await this.repo.create(atendimentoId, tipo);
  }
}
