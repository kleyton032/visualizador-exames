import { AnexoRepository } from './anexo.repository';
import { PostgresConnection } from '../../shared/database/PostgresConnection';

jest.mock('../../shared/database/PostgresConnection', () => ({
  PostgresConnection: {
    getInstance: jest.fn(),
  },
}));

describe('AnexoRepository - listarPorPaciente', () => {
  let repository: AnexoRepository;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = jest.fn().mockResolvedValue({ rows: [] });
    (PostgresConnection.getInstance as jest.Mock).mockReturnValue({ query: mockQuery });
    repository = new AnexoRepository();
  });

  it('deve montar a query base com paginação e ordenação', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] });

    await repository.listarPorPaciente(123, { page: 1, pageSize: 20 });

    expect(mockQuery).toHaveBeenCalledTimes(2);
    const [query, params] = mockQuery.mock.calls[0];
    expect(query).toContain('ae.cd_paciente = $1');
    expect(query).toContain('LEFT JOIN exames e');
    expect(query).toContain('ORDER BY ae.criado_em DESC, ae.id DESC');
    expect(query).toContain('LIMIT $2 OFFSET $3');
    expect(params).toEqual([123, 20, 0]);
  });

  it('deve incluir o filtro de status e ajustar os placeholders', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] });

    await repository.listarPorPaciente(123, { page: 2, pageSize: 10, status: 'A' });

    const [query, params] = mockQuery.mock.calls[0];
    expect(query).toContain('ae.statusdoc = $2');
    expect(query).toContain('LIMIT $3 OFFSET $4');
    expect(params).toEqual([123, 'A', 10, 10]);
  });

  it('deve mapear as linhas para o formato de saída', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            ID: '10',
            CD_PACIENTE: 123,
            CD_ATENDIMENTO: 456,
            ID_EXAME: 7,
            TIPO_EXAME: 'Retinografia',
            NOME_EXAME: 'Retinografia Colorida',
            OLHO: 'OE',
            OBSERVACOES: null,
            NOME_ARQUIVO: 'exame.pdf',
            CONTENT_TYPE: 'application/pdf',
            TAMANHO_BYTES: '152000',
            STATUSDOC: 'A',
            CRIADO_EM: '2026-10-09T10:30:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ total: 1 }] });

    const result = await repository.listarPorPaciente(123, { page: 1, pageSize: 20 });

    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.data).toEqual([
      {
        id: 10,
        cd_paciente: 123,
        cd_atendimento: 456,
        id_exame: 7,
        tipo_exame: 'Retinografia',
        nome_exame: 'Retinografia Colorida',
        olho: 'OE',
        observacoes: null,
        nome_arquivo: 'exame.pdf',
        content_type: 'application/pdf',
        tamanho_bytes: 152000,
        statusdoc: 'A',
        criado_em: '2026-10-09T10:30:00.000Z',
      },
    ]);
  });
});
