import { AnexoRepository } from './anexo.repository';

export class AnexoService {
  private repo = new AnexoRepository();
  async create(documentoId: number, nomeArquivo: string) {
    await this.repo.create(documentoId, nomeArquivo);
  }
}
