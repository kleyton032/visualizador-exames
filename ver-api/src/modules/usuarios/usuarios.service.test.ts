import { UsuariosService } from './usuarios.service';
import { UsuariosRepository } from './usuarios.repository';
import { AuthRepository } from '../auth/auth.repository';
import { gerarSenhaTemporaria } from '../../shared/security/password';

jest.mock('./usuarios.repository');
jest.mock('../auth/auth.repository');
jest.mock('../../shared/security/password', () => ({
  gerarSenhaTemporaria: jest.fn(() => 'Temp#12345'),
  hashPassword: jest.fn((senha) => Promise.resolve(`hashed_${senha}`)),
}));

describe('UsuariosService', () => {
  let service: UsuariosService;
  let mockRepo: jest.Mocked<UsuariosRepository>;
  let mockAuthRepo: jest.Mocked<AuthRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = new UsuariosRepository() as jest.Mocked<UsuariosRepository>;
    mockAuthRepo = new AuthRepository() as jest.Mocked<AuthRepository>;
    service = new UsuariosService();
    (service as any).repo = mockRepo;
    (service as any).authRepo = mockAuthRepo;
    (gerarSenhaTemporaria as unknown as jest.Mock).mockReturnValue('Temp#12345');
  });

  describe('redefinirSenha', () => {
    it('gera senha temporária, define troca obrigatória, revoga sessões e audita', async () => {
      mockAuthRepo.findById.mockResolvedValue({ ID: 5, LOGIN: 'operador' } as any);

      const resultado = await service.redefinirSenha(1, 5, { ip: '1.2.3.4', userAgent: 'ua' });

      expect(mockAuthRepo.definirSenhaTemporaria).toHaveBeenCalledWith(5, 'hashed_Temp#12345', expect.any(Date));
      expect(mockAuthRepo.revogarSessoesUsuario).toHaveBeenCalledWith(5);
      expect(mockRepo.registrarRedefinicao).toHaveBeenCalledWith(1, 5, '1.2.3.4', 'ua');
      expect(mockAuthRepo.log).toHaveBeenCalledWith('ADMIN_RESET_SENHA', expect.objectContaining({ usuarioId: 5 }));
      expect(resultado.senhaTemporaria).toBe('Temp#12345');
    });

    it('impede redefinir a própria senha', async () => {
      mockAuthRepo.findById.mockResolvedValue({ ID: 1 } as any);

      await expect(service.redefinirSenha(1, 1)).rejects.toThrow('Não é permitido redefinir a própria senha');
      expect(mockAuthRepo.definirSenhaTemporaria).not.toHaveBeenCalled();
    });

    it('rejeita usuário inexistente', async () => {
      mockAuthRepo.findById.mockResolvedValue(undefined);

      await expect(service.redefinirSenha(1, 999)).rejects.toThrow('Usuário não encontrado');
    });
  });

  describe('atualizar', () => {
    it('rejeita perfil inválido', async () => {
      await expect(service.atualizar(1, 2, { perfil: 'SUPER' })).rejects.toThrow('Perfil inválido');
    });

    it('rejeita e-mail já utilizado por outro usuário', async () => {
      mockAuthRepo.findByEmail.mockResolvedValue({ ID: 9 } as any);

      await expect(service.atualizar(1, 2, { email: 'x@y.com' })).rejects.toThrow('Já existe um usuário com esse email');
    });

    it('impede bloquear a própria conta', async () => {
      mockAuthRepo.findById.mockResolvedValue({ ID: 1 } as any);

      await expect(service.atualizar(1, 1, { situacao: 'B' })).rejects.toThrow('Não é permitido bloquear a própria conta');
    });

    it('bloqueia o usuário e revoga as sessões', async () => {
      mockAuthRepo.findById.mockResolvedValue({ ID: 2 } as any);

      await service.atualizar(1, 2, { situacao: 'B' });

      expect(mockRepo.atualizar).toHaveBeenCalledWith(2, { situacao: 'B' });
      expect(mockAuthRepo.revogarSessoesUsuario).toHaveBeenCalledWith(2);
    });
  });
});
