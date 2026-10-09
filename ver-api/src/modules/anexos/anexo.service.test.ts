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

describe('AnexoService - bloquearExame', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('exige motivo com pelo menos 5 caracteres', async () => {
    const service = new AnexoService();
    await expect(service.bloquearExame(1, '  ', { id: 9 })).rejects.toThrow(/motivo do bloqueio/i);
  });

  it('bloqueia registrando motivo, responsável e substituto', async () => {
    jest.spyOn(AnexoRepository.prototype, 'getAnexoById').mockImplementation(async (id: number) =>
      (id === 1
        ? { CD_PACIENTE: 123, STATUSDOC: 'A' }
        : { CD_PACIENTE: 123, STATUSDOC: 'A' }) as any);
    const bloquearSpy = jest
      .spyOn(AnexoRepository.prototype, 'bloquear')
      .mockResolvedValue(undefined as any);

    const service = new AnexoService();
    const resultado = await service.bloquearExame(1, 'Exame anexado ao paciente incorreto', { id: 9 }, 2);

    expect(resultado).toBe(true);
    expect(bloquearSpy).toHaveBeenCalledWith(1, 'Exame anexado ao paciente incorreto', 9, 2);
  });

  it('recusa substituto pertencente a outro paciente', async () => {
    jest.spyOn(AnexoRepository.prototype, 'getAnexoById').mockImplementation(async (id: number) =>
      (id === 1
        ? { CD_PACIENTE: 123, STATUSDOC: 'A' }
        : { CD_PACIENTE: 999, STATUSDOC: 'A' }) as any);

    const service = new AnexoService();
    await expect(service.bloquearExame(1, 'Motivo valido', { id: 9 }, 2)).rejects.toThrow(/mesmo paciente/i);
  });

  it('recusa substituir por ele mesmo', async () => {
    jest.spyOn(AnexoRepository.prototype, 'getAnexoById').mockResolvedValue({ CD_PACIENTE: 123, STATUSDOC: 'A' } as any);

    const service = new AnexoService();
    await expect(service.bloquearExame(1, 'Motivo valido', { id: 9 }, 1)).rejects.toThrow(/diferente do exame bloqueado/i);
  });
});
