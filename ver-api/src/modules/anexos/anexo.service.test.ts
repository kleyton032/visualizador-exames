import { AnexoService } from './anexo.service';
import { AnexoRepository } from './anexo.repository';

describe('AnexoService - listarExamesPorPaciente', () => {
  it('deve aplicar limites de paginação e repassar os filtros', async () => {
    const spy = jest
      .spyOn(AnexoRepository.prototype, 'listarPorPaciente')
      .mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20 });

    const service = new AnexoService();
    await service.listarExamesPorPaciente(123, { page: 0, pageSize: 500, status: 'A' });

    expect(spy).toHaveBeenCalledWith(123, { page: 1, pageSize: 100, status: 'A' });
    spy.mockRestore();
  });

  it('deve usar defaults de paginação quando não informados', async () => {
    const spy = jest
      .spyOn(AnexoRepository.prototype, 'listarPorPaciente')
      .mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20 });

    const service = new AnexoService();
    await service.listarExamesPorPaciente(123, { page: 2, pageSize: 10 });

    expect(spy).toHaveBeenCalledWith(123, { page: 2, pageSize: 10, status: undefined });
    spy.mockRestore();
  });
});
