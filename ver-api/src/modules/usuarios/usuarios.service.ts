import { AuthRepository } from '../auth/auth.repository';
import { Perfil } from '../auth/auth.types';
import { gerarSenhaTemporaria, hashPassword } from '../../shared/security/password';
import {
  AtualizarUsuarioInput,
  AuditoriaRedefinicao,
  FiltroUsuarios,
  Paginado,
  UsuarioListagem,
  UsuariosRepository,
} from './usuarios.repository';

const PERFIS_VALIDOS: Perfil[] = ['ADMIN', 'OPERADOR', 'VISUALIZADOR'];
const SITUACOES_VALIDAS = ['A', 'B'];
const VALIDADE_SENHA_TEMPORARIA_MS = 24 * 60 * 60 * 1000;

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export interface RedefinicaoResultado {
  senhaTemporaria: string;
  expiraEm: Date;
}

export class UsuariosService {
  private repo = new UsuariosRepository();
  private authRepo = new AuthRepository();

  async listar(filtro: FiltroUsuarios): Promise<Paginado<UsuarioListagem>> {
    return this.repo.listar(filtro);
  }

  async detalhar(id: number): Promise<UsuarioListagem> {
    const usuario = await this.repo.findById(id);
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }
    return usuario;
  }

  async atualizar(adminId: number, id: number, input: AtualizarUsuarioInput): Promise<void> {
    if (input.perfil !== undefined && !PERFIS_VALIDOS.includes(input.perfil as Perfil)) {
      throw new Error('Perfil inválido. Use ADMIN, OPERADOR ou VISUALIZADOR');
    }
    if (input.situacao !== undefined && !SITUACOES_VALIDAS.includes(input.situacao)) {
      throw new Error('Situação inválida. Use A (ativo) ou B (bloqueado)');
    }

    if (input.email !== undefined && input.email) {
      const existente = await this.authRepo.findByEmail(input.email);
      if (existente && existente.ID !== id) {
        throw new Error('Já existe um usuário com esse email');
      }
    }

    const alvo = await this.authRepo.findById(id);
    if (!alvo) {
      throw new Error('Usuário não encontrado');
    }
    if (alvo.ID === adminId && input.situacao === 'B') {
      throw new Error('Não é permitido bloquear a própria conta');
    }

    await this.repo.atualizar(id, input);

    if (input.situacao === 'B') {
      await this.authRepo.revogarSessoesUsuario(id);
    }
  }

  async redefinirSenha(adminId: number, id: number, meta: RequestMeta = {}): Promise<RedefinicaoResultado> {
    const alvo = await this.authRepo.findById(id);
    if (!alvo) {
      throw new Error('Usuário não encontrado');
    }
    if (alvo.ID === adminId) {
      throw new Error('Não é permitido redefinir a própria senha');
    }

    const senhaTemporaria = gerarSenhaTemporaria();
    const senhaHash = await hashPassword(senhaTemporaria);
    const expiraEm = new Date(Date.now() + VALIDADE_SENHA_TEMPORARIA_MS);

    await this.authRepo.definirSenhaTemporaria(id, senhaHash, expiraEm);
    await this.authRepo.revogarSessoesUsuario(id);
    await this.repo.registrarRedefinicao(adminId, id, meta.ip, meta.userAgent);
    await this.authRepo.log('ADMIN_RESET_SENHA', { usuarioId: id, detalhe: `Por admin ${adminId}`, ...meta });

    return { senhaTemporaria, expiraEm };
  }

  async auditoria(id: number): Promise<AuditoriaRedefinicao[]> {
    return this.repo.listarAuditoria(id);
  }
}
