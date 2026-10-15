import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import * as crypto from 'crypto';
import { hashToken } from '../../shared/security/token';
import { comparePassword, validarPoliticaSenha } from '../../shared/security/password';

// Moca o repositório
jest.mock('./auth.repository');
jest.mock('../../shared/security/token', () => ({
  hashToken: jest.fn((token) => `hashed_${token}`),
  generateRefreshToken: jest.fn(() => 'refresh-token'),
}));
jest.mock('../../shared/security/password', () => ({
  hashPassword: jest.fn((senha) => Promise.resolve(`hashed_${senha}`)),
  comparePassword: jest.fn(),
  validarPoliticaSenha: jest.fn(() => []),
}));

describe('AuthService - Recuperação de Senha', () => {
  let authService: AuthService;
  let mockRepo: jest.Mocked<AuthRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = new AuthRepository() as jest.Mocked<AuthRepository>;
    authService = new AuthService();
    (authService as any).repo = mockRepo;
  });

  describe('forgotPassword', () => {
    it('should return silently if email does not exist (prevents enumeration)', async () => {
      mockRepo.findByEmail.mockResolvedValue(undefined);

      await authService.forgotPassword('teste@teste.com');

      expect(mockRepo.findByEmail).toHaveBeenCalledWith('teste@teste.com');
      expect(mockRepo.createRecuperacaoSenha).not.toHaveBeenCalled();
    });

    it('should generate token and save to database if email exists and user is active', async () => {
      mockRepo.findByEmail.mockResolvedValue({
        ID: 1,
        EMAIL: 'teste@teste.com',
        SITUACAO: 'A',
      } as any);

      await authService.forgotPassword('teste@teste.com');

      expect(mockRepo.findByEmail).toHaveBeenCalledWith('teste@teste.com');
      expect(mockRepo.createRecuperacaoSenha).toHaveBeenCalledWith(
        1,
        expect.any(String),
        expect.any(Date)
      );
    });
  });

  describe('resetPassword', () => {
    it('should throw error if token or password is invalid', async () => {
      await expect(authService.resetPassword('', 'senha123')).rejects.toThrow('Token e senha (mínimo 8 caracteres) são obrigatórios');
      await expect(authService.resetPassword('token-valido', '123')).rejects.toThrow('Token e senha (mínimo 8 caracteres) são obrigatórios');
    });

    it('should throw error if token does not exist or is expired', async () => {
      mockRepo.findRecuperacaoSenhaByTokenHash.mockResolvedValue(undefined);

      await expect(authService.resetPassword('meu-token', 'novaSenha123!')).rejects.toThrow('Token inválido ou expirado');
    });

    it('should reset password and revoke sessions if data is correct', async () => {
      const token = 'token-valido';
      mockRepo.findRecuperacaoSenhaByTokenHash.mockResolvedValue({
        id: 10,
        usuario_id: 1,
        usado: false,
        expira_em: new Date(Date.now() + 10000), // no futuro
      });

      await authService.resetPassword(token, 'novaSenha123!');

      expect(mockRepo.updateSenha).toHaveBeenCalledWith(1, 'hashed_novaSenha123!');
      expect(mockRepo.marcarRecuperacaoUsada).toHaveBeenCalledWith(10);
      expect(mockRepo.revogarSessoesUsuario).toHaveBeenCalledWith(1);
    });
  });

  describe('login — troca obrigatória de senha', () => {
    beforeEach(() => {
      (comparePassword as unknown as jest.Mock).mockResolvedValue(true);
      mockRepo.resetarFalhasLogin.mockResolvedValue(undefined);
    });

    it('emite token de escopo restrito quando a troca é obrigatória', async () => {
      mockRepo.findByLogin.mockResolvedValue({
        ID: 1,
        LOGIN: 'operador',
        NOME: 'Operador',
        EMAIL: null,
        PERFIL: 'OPERADOR',
        SITUACAO: 'A',
        SENHA_HASH: 'hash',
        PRECISA_TROCAR_SENHA: true,
        SENHA_TEMPORARIA_EXPIRA_EM: new Date(Date.now() + 60_000),
      } as any);

      const result = await authService.login('operador', 'senhaTemporaria1!');

      expect(result.mustChangePassword).toBe(true);
      expect(result.refreshToken).toBeUndefined();
      expect(result.accessToken).toBeDefined();
      expect(mockRepo.createSessao).not.toHaveBeenCalled();
    });

    it('recusa login quando a senha temporária expirou', async () => {
      mockRepo.findByLogin.mockResolvedValue({
        ID: 1,
        LOGIN: 'operador',
        NOME: 'Operador',
        EMAIL: null,
        PERFIL: 'OPERADOR',
        SITUACAO: 'A',
        SENHA_HASH: 'hash',
        PRECISA_TROCAR_SENHA: true,
        SENHA_TEMPORARIA_EXPIRA_EM: new Date(Date.now() - 60_000),
      } as any);

      await expect(authService.login('operador', 'senhaTemporaria1!'))
        .rejects.toThrow('Sua senha temporária expirou');
    });

    it('emite sessão normal quando não há troca obrigatória', async () => {
      mockRepo.findByLogin.mockResolvedValue({
        ID: 1,
        LOGIN: 'operador',
        NOME: 'Operador',
        EMAIL: null,
        PERFIL: 'OPERADOR',
        SITUACAO: 'A',
        SENHA_HASH: 'hash',
        PRECISA_TROCAR_SENHA: false,
      } as any);

      const result = await authService.login('operador', 'senhaSegura1!');

      expect(result.mustChangePassword).toBeUndefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockRepo.createSessao).toHaveBeenCalled();
    });
  });

  describe('trocarSenhaObrigatoria', () => {
    it('recusa quando não há troca pendente', async () => {
      mockRepo.findById.mockResolvedValue({
        ID: 1,
        LOGIN: 'operador',
        NOME: 'Operador',
        PRECISA_TROCAR_SENHA: false,
      } as any);

      await expect(authService.trocarSenhaObrigatoria(1, 'SenhaNova1!'))
        .rejects.toThrow('Não há troca de senha obrigatória pendente');
    });

    it('recusa senha que não atende à política', async () => {
      mockRepo.findById.mockResolvedValue({
        ID: 1,
        LOGIN: 'operador',
        NOME: 'Operador',
        PRECISA_TROCAR_SENHA: true,
      } as any);
      (validarPoliticaSenha as unknown as jest.Mock).mockReturnValue(['A senha deve ter pelo menos 10 caracteres']);

      await expect(authService.trocarSenhaObrigatoria(1, 'fraca'))
        .rejects.toThrow('A senha deve ter pelo menos 10 caracteres');
    });

    it('atualiza a senha, revoga sessões e emite sessão normal', async () => {
      mockRepo.findById.mockResolvedValue({
        ID: 1,
        LOGIN: 'operador',
        NOME: 'Operador',
        PERFIL: 'OPERADOR',
        SITUACAO: 'A',
        PRECISA_TROCAR_SENHA: true,
      } as any);
      (validarPoliticaSenha as unknown as jest.Mock).mockReturnValue([]);

      const result = await authService.trocarSenhaObrigatoria(1, 'SenhaNova1!');

      expect(mockRepo.updateSenha).toHaveBeenCalledWith(1, 'hashed_SenhaNova1!');
      expect(mockRepo.revogarSessoesUsuario).toHaveBeenCalledWith(1);
      expect(mockRepo.createSessao).toHaveBeenCalled();
      expect(result.refreshToken).toBeDefined();
      expect(result.mustChangePassword).toBeUndefined();
    });
  });
});
