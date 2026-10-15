import { MedicoCadastroService } from './medico.service';
import { AuthRepository } from '../auth/auth.repository';
import { MedicoOracleRepository } from './medico.oracle.repository';
import { MedicoRepository } from './medico.repository';
import { config } from '../../shared/config';

jest.mock('../auth/auth.repository');
jest.mock('./medico.oracle.repository');
jest.mock('./medico.repository');
jest.mock('../../shared/security/password', () => ({
  hashPassword: jest.fn((senha) => Promise.resolve(`hashed_${senha}`)),
  validarPoliticaSenha: jest.fn(() => []),
}));
jest.mock('../../shared/security/token', () => ({
  hashToken: jest.fn((token) => `hashed_${token}`),
  generateRefreshToken: jest.fn(() => 'refresh-token'),
}));
jest.mock('../../shared/config', () => ({
  config: { medicoCdTipPresta: [], refreshTokenTtlDays: 1, jwtSecret: 'test', jwtAccessExpires: '15m' },
}));

function prestadorElegivel(overrides: Record<string, unknown> = {}) {
  return {
    cd_usuario: 10,
    nm_usuario: 'JOAO DA SILVA',
    dt_nascimento: new Date(1980, 4, 10),
    sn_ativo: 'S',
    cd_prestador: 55,
    nm_prestador: 'JOAO DA SILVA',
    cpf: '12345678901',
    cd_tip_presta: 3,
    tip_prestador: '3-MEDICO',
    sn_integra_onepass: 'S',
    ...overrides,
  };
}

describe('MedicoCadastroService', () => {
  let service: MedicoCadastroService;
  let oracleRepo: jest.Mocked<MedicoOracleRepository>;
  let medicoRepo: jest.Mocked<MedicoRepository>;
  let authRepo: jest.Mocked<AuthRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    config.medicoCdTipPresta = [];
    // Restaura o mock da política (o clearAllMocks não limpa mockReturnValue).
    const { validarPoliticaSenha } = require('../../shared/security/password');
    validarPoliticaSenha.mockReturnValue([]);
    service = new MedicoCadastroService();
    oracleRepo = new MedicoOracleRepository() as jest.Mocked<MedicoOracleRepository>;
    medicoRepo = new MedicoRepository() as jest.Mocked<MedicoRepository>;
    authRepo = new AuthRepository() as jest.Mocked<AuthRepository>;
    (service as any).oracleRepo = oracleRepo;
    (service as any).medicoRepo = medicoRepo;
    (service as any).authRepo = authRepo;
  });

  describe('iniciarCadastro', () => {
    it('recusa CPF inválido', async () => {
      await expect(service.iniciarCadastro('123', '1980-05-10')).rejects.toThrow('CPF inválido.');
    });

    it('recusa data de nascimento ausente', async () => {
      await expect(service.iniciarCadastro('12345678901', '')).rejects.toThrow('Data de nascimento é obrigatória.');
    });

    it('aceita data de nascimento no formato DDMMAAAA', async () => {
      oracleRepo.buscarPorCpf.mockResolvedValue([
        prestadorElegivel({ dt_nascimento: new Date(1993, 5, 24) }),
      ]);
      authRepo.findByCpf.mockResolvedValue(undefined);
      authRepo.findByCdPrestador.mockResolvedValue(undefined);

      const resultado = await service.iniciarCadastro('12345678901', '24061993');

      expect(resultado.token).toBeDefined();
      expect(medicoRepo.createAutocadastro).toHaveBeenCalled();
    });

    it('recusa quando não há prestador elegível', async () => {
      oracleRepo.buscarPorCpf.mockResolvedValue([]);
      await expect(service.iniciarCadastro('12345678901', '1980-05-10'))
        .rejects.toThrow('Não foi possível validar seu cadastro');
      expect(authRepo.log).toHaveBeenCalledWith('AUTOCADASTRO_MEDICO_FALHA', expect.any(Object));
    });

    it('retorna erro amigável quando a consulta ao Oracle falha', async () => {
      oracleRepo.buscarPorCpf.mockRejectedValue(new Error('ORA-00904: invalid identifier'));
      await expect(service.iniciarCadastro('12345678901', '1980-05-10'))
        .rejects.toThrow('Não foi possível consultar o cadastro agora');
      expect(authRepo.log).toHaveBeenCalledWith('AUTOCADASTRO_MEDICO_FALHA', expect.any(Object));
    });

    it('recusa CPF já cadastrado na aplicação', async () => {
      oracleRepo.buscarPorCpf.mockResolvedValue([prestadorElegivel()]);
      authRepo.findByCpf.mockResolvedValue({ ID: 1 } as any);
      await expect(service.iniciarCadastro('12345678901', '1980-05-10'))
        .rejects.toThrow('Já existe uma conta vinculada');
    });

    it('gera token de cadastro para prestador elegível', async () => {
      oracleRepo.buscarPorCpf.mockResolvedValue([prestadorElegivel()]);
      authRepo.findByCpf.mockResolvedValue(undefined);
      authRepo.findByCdPrestador.mockResolvedValue(undefined);

      const resultado = await service.iniciarCadastro('123.456.789-01', '1980-05-10');

      expect(resultado.token).toBeDefined();
      expect(resultado.nome).toContain('JOAO');
      expect(resultado.onepassIntegrado).toBe(false);
      expect(medicoRepo.createAutocadastro).toHaveBeenCalledWith(
        expect.objectContaining({ cpf: '12345678901', cdPrestador: 55 }),
      );
    });

    it('aplica o filtro de tipo de prestador quando configurado', async () => {
      config.medicoCdTipPresta = ['3'];
      oracleRepo.buscarPorCpf.mockResolvedValue([
        prestadorElegivel({ cd_tip_presta: 2 }),
        prestadorElegivel({ cd_tip_presta: 3 }),
      ]);
      authRepo.findByCpf.mockResolvedValue(undefined);
      authRepo.findByCdPrestador.mockResolvedValue(undefined);

      const resultado = await service.iniciarCadastro('12345678901', '1980-05-10');
      expect(medicoRepo.createAutocadastro).toHaveBeenCalledWith(
        expect.objectContaining({ cdPrestador: 55 }),
      );
      expect(resultado.onepassIntegrado).toBe(false);
    });
  });

  describe('enviarCodigoEmail', () => {
    const token = 'cadastro-token';

    function cadastroPendente(overrides: Record<string, unknown> = {}) {
      return {
        id: 1,
        token_hash: `hashed_${token}`,
        cpf: '12345678901',
        cd_prestador: 55,
        cd_usuario_mv: 10,
        nome: 'JOAO DA SILVA',
        email: null,
        senha_hash: null,
        codigo_hash: null,
        codigo_expira_em: null,
        expira_em: new Date(Date.now() + 60_000),
        usado: false,
        criado_em: new Date(),
        ...overrides,
      };
    }

    it('recusa e-mail inválido', async () => {
      await expect(service.enviarCodigoEmail(token, { email: 'invalido', senha: 'Senha1!', confirmacao: 'Senha1!' }))
        .rejects.toThrow('E-mail inválido.');
    });

    it('recusa quando a confirmação difere da senha', async () => {
      await expect(service.enviarCodigoEmail(token, { email: 'a@b.com', senha: 'Senha1!', confirmacao: 'Senha2!' }))
        .rejects.toThrow('As senhas não coincidem.');
    });

    it('recusa senha que não atende à política', async () => {
      medicoRepo.findByTokenHash.mockResolvedValue(cadastroPendente() as any);
      const { validarPoliticaSenha } = require('../../shared/security/password');
      validarPoliticaSenha.mockReturnValue(['A senha deve ter pelo menos 10 caracteres']);

      await expect(service.enviarCodigoEmail(token, { email: 'a@b.com', senha: 'fraca', confirmacao: 'fraca' }))
        .rejects.toThrow('A senha deve ter pelo menos 10 caracteres');
    });

    it('recusa e-mail já utilizado', async () => {
      medicoRepo.findByTokenHash.mockResolvedValue(cadastroPendente() as any);
      authRepo.findByEmail.mockResolvedValue({ ID: 9 } as any);

      await expect(service.enviarCodigoEmail(token, { email: 'ja@b.com', senha: 'SenhaForte1!', confirmacao: 'SenhaForte1!' }))
        .rejects.toThrow('Já existe uma conta com esse e-mail.');
    });

    it('grava os dados da conta e envia o código', async () => {
      medicoRepo.findByTokenHash.mockResolvedValue(cadastroPendente() as any);
      authRepo.findByEmail.mockResolvedValue(undefined);

      await service.enviarCodigoEmail(token, { email: 'medico@b.com', senha: 'SenhaForte1!', confirmacao: 'SenhaForte1!' });

      expect(medicoRepo.registrarDadosConta).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ email: 'medico@b.com', senhaHash: 'hashed_SenhaForte1!' }),
      );
    });
  });

  describe('concluirCadastro', () => {
    const token = 'cadastro-token';
    const codigo = '123456';

    function cadastroCompleto(overrides: Record<string, unknown> = {}) {
      return {
        id: 1,
        token_hash: `hashed_${token}`,
        cpf: '12345678901',
        cd_prestador: 55,
        cd_usuario_mv: 10,
        nome: 'JOAO DA SILVA',
        email: 'medico@b.com',
        senha_hash: 'hashed_SenhaForte1!',
        codigo_hash: `hashed_${codigo}`,
        codigo_expira_em: new Date(Date.now() + 60_000),
        expira_em: new Date(Date.now() + 60_000),
        usado: false,
        criado_em: new Date(),
        ...overrides,
      };
    }

    it('recusa código inválido', async () => {
      medicoRepo.findByTokenHash.mockResolvedValue(cadastroCompleto() as any);
      await expect(service.concluirCadastro(token, '000000')).rejects.toThrow('Código inválido ou expirado.');
    });

    it('recusa código expirado', async () => {
      medicoRepo.findByTokenHash.mockResolvedValue(
        cadastroCompleto({ codigo_expira_em: new Date(Date.now() - 1000) }) as any,
      );
      await expect(service.concluirCadastro(token, codigo)).rejects.toThrow('Código inválido ou expirado.');
    });

    it('cria a conta MEDICO, marca como usado e emite sessão', async () => {
      medicoRepo.findByTokenHash.mockResolvedValue(cadastroCompleto() as any);
      authRepo.findByCpf.mockResolvedValue(undefined);
      authRepo.findByCdPrestador.mockResolvedValue(undefined);
      authRepo.createUsuarioMedico.mockResolvedValue(42);

      const resultado = await service.concluirCadastro(token, codigo);

      expect(authRepo.createUsuarioMedico).toHaveBeenCalledWith(
        expect.objectContaining({ login: '12345678901', cpf: '12345678901', cdPrestador: 55 }),
      );
      expect(medicoRepo.marcarUsado).toHaveBeenCalledWith(1);
      expect(authRepo.createSessao).toHaveBeenCalled();
      expect(resultado.user.perfil).toBe('MEDICO');
      expect(resultado.refreshToken).toBeDefined();
    });
  });
});
