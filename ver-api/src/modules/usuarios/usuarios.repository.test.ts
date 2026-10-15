import { UsuariosRepository } from './usuarios.repository';
import { PostgresConnection } from '../../shared/database/PostgresConnection';

jest.mock('../../shared/database/PostgresConnection', () => ({
  PostgresConnection: {
    getInstance: jest.fn(),
  },
}));

describe('UsuariosRepository - listar', () => {
  let repository: UsuariosRepository;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = jest.fn().mockResolvedValue({ rows: [] });
    (PostgresConnection.getInstance as jest.Mock).mockReturnValue({ query: mockQuery });
    repository = new UsuariosRepository();
  });

  it('monta consulta com paginação e sem filtros', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockResolvedValueOnce({ rows: [] });

    await repository.listar({ page: 1, pageSize: 20 });

    expect(mockQuery).toHaveBeenCalledTimes(2);
    const [query, params] = mockQuery.mock.calls[1];
    expect(query).toContain('FROM app_usuarios');
    expect(query).toContain('ORDER BY nome ASC NULLS LAST, login ASC');
    expect(query).toContain('LIMIT $1 OFFSET $2');
    expect(params).toEqual([20, 0]);
  });

  it('inclui filtros de busca, perfil e situação com placeholders corretos', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockResolvedValueOnce({ rows: [] });

    await repository.listar({ busca: 'maria', perfil: 'OPERADOR', situacao: 'A', page: 2, pageSize: 10 });

    const [query, params] = mockQuery.mock.calls[1];
    expect(query).toContain('login ILIKE $1 OR nome ILIKE $1 OR email ILIKE $1');
    expect(query).toContain('perfil = $2');
    expect(query).toContain('situacao = $3');
    expect(query).toContain('LIMIT $4 OFFSET $5');
    expect(params).toEqual(['%maria%', 'OPERADOR', 'A', 10, 10]);
  });

  it('registra redefinição administrativa com dados do request', async () => {
    await repository.registrarRedefinicao(1, 7, '10.0.0.1', 'ua');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO auth_redefinicao_senha'),
      [1, 7, '10.0.0.1', 'ua'],
    );
  });
});
