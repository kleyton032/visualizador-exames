import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import * as crypto from 'crypto';
import { hashToken } from '../../shared/security/token';

// Moca o repositório
jest.mock('./auth.repository');
jest.mock('../../shared/security/token', () => ({
  hashToken: jest.fn((token) => `hashed_${token}`),
}));
jest.mock('../../shared/security/password', () => ({
  hashPassword: jest.fn((senha) => Promise.resolve(`hashed_${senha}`)),
  comparePassword: jest.fn(),
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
});
