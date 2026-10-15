import * as crypto from 'crypto';
import { AuthRepository } from '../auth/auth.repository';
import { Perfil, SafeUser } from '../auth/auth.types';
import { hashPassword, validarPoliticaSenha } from '../../shared/security/password';
import { generateRefreshToken, hashToken } from '../../shared/security/token';
import { signAccessToken } from '../../shared/security/jwt';
import { config } from '../../shared/config';
import {
  BadRequestError,
  ConflictError,
  ServiceUnavailableError,
  UnprocessableEntityError,
} from '../../shared/errors/AppError';
import { MedicoOracleRepository, PrestadorMV } from './medico.oracle.repository';
import { MedicoRepository } from './medico.repository';

const TOKEN_TTL_MS = 15 * 60 * 1000; // cadastroToken: 15 minutos
const CODIGO_TTL_MS = 10 * 60 * 1000; // código de e-mail: 10 minutos

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export interface IniciarCadastroResultado {
  token: string;
  nome: string;
  onepassIntegrado: boolean;
}

export interface ConcluirCadastroResultado {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

function normalizarCpf(cpf: string): string {
  const digitos = (cpf || '').replace(/\D/g, '');
  if (digitos.length !== 11) {
    throw new BadRequestError('CPF inválido.');
  }
  return digitos;
}

function normalizarDataNascimento(data: string): string {
  const valor = (data || '').trim();
  if (!valor) {
    throw new BadRequestError('Data de nascimento é obrigatória.');
  }

  let ano: number, mes: number, dia: number;

  const matchIso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  const matchBarras = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor);
  const digitos = valor.replace(/\D/g, '');

  if (matchIso) {
    [ano, mes, dia] = [Number(matchIso[1]), Number(matchIso[2]), Number(matchIso[3])];
  } else if (matchBarras) {
    [dia, mes, ano] = [Number(matchBarras[1]), Number(matchBarras[2]), Number(matchBarras[3])];
  } else if (/^\d{8}$/.test(digitos)) {
    // Aceita DDMMAAAA (padrão brasileiro) e, como fallback, AAAAMMDD.
    dia = Number(digitos.slice(0, 2));
    mes = Number(digitos.slice(2, 4));
    ano = Number(digitos.slice(4, 8));
    if (ano < 1900 || mes < 1 || mes > 12 || dia < 1 || dia > 31) {
      ano = Number(digitos.slice(0, 4));
      mes = Number(digitos.slice(4, 6));
      dia = Number(digitos.slice(6, 8));
    }
  } else {
    throw new BadRequestError('Data de nascimento inválida. Use DD/MM/AAAA ou AAAA-MM-DD.');
  }

  const dt = new Date(Date.UTC(ano, mes - 1, dia));
  if (dt.getUTCFullYear() !== ano || dt.getUTCMonth() !== mes - 1 || dt.getUTCDate() !== dia) {
    throw new BadRequestError('Data de nascimento inválida.');
  }

  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function dataParaISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mascararNome(nome: string | null): string {
  if (!nome) return 'Médico';
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1][0]}.`;
}

function novoRefreshExpira(): Date {
  return new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
}

export class MedicoCadastroService {
  private oracleRepo = new MedicoOracleRepository();
  private medicoRepo = new MedicoRepository();
  private authRepo = new AuthRepository();

  /**
   * Etapa 1 — valida CPF + data de nascimento contra o Oracle (MV) e gera um
   * token de cadastro associado ao vínculo identificado.
   */
  async iniciarCadastro(cpf: string, dataNascimento: string, meta: RequestMeta = {}): Promise<IniciarCadastroResultado> {
    const cpfNormalizado = normalizarCpf(cpf);
    const nascimentoInformado = normalizarDataNascimento(dataNascimento);

    let candidatos: PrestadorMV[];
    try {
      candidatos = await this.oracleRepo.buscarPorCpf(cpfNormalizado);
    } catch (error) {
      await this.authRepo.log('AUTOCADASTRO_MEDICO_FALHA', {
        detalhe: 'Falha na consulta ao Oracle',
        ...meta,
      });
      throw new ServiceUnavailableError('Não foi possível consultar o cadastro agora. Tente novamente em instantes.');
    }

    const elegivel = this.selecionarElegivel(candidatos, cpfNormalizado, nascimentoInformado);
    if (!elegivel) {
      await this.authRepo.log('AUTOCADASTRO_MEDICO_FALHA', {
        detalhe: 'CPF/nascimento não elegível',
        ...meta,
      });
      throw new UnprocessableEntityError('Não foi possível validar seu cadastro com os dados informados.');
    }

    // Evita cadastros duplicados (1 prestador/CPF = 1 conta).
    const jaCadastradoCpf = await this.authRepo.findByCpf(cpfNormalizado);
    if (jaCadastradoCpf) {
      throw new ConflictError('Já existe uma conta vinculada a este cadastro.');
    }
    if (elegivel.cd_prestador != null) {
      const jaCadastradoPrestador = await this.authRepo.findByCdPrestador(elegivel.cd_prestador);
      if (jaCadastradoPrestador) {
        throw new ConflictError('Já existe uma conta vinculada a este cadastro.');
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    await this.medicoRepo.createAutocadastro({
      tokenHash: hashToken(token),
      cpf: cpfNormalizado,
      cdPrestador: Number(elegivel.cd_prestador),
      cdUsuarioMv: elegivel.cd_usuario != null ? Number(elegivel.cd_usuario) : null,
      nome: elegivel.nm_prestador ?? elegivel.nm_usuario,
      expiraEm: new Date(Date.now() + TOKEN_TTL_MS),
    });

    await this.authRepo.log('AUTOCADASTRO_MEDICO_INICIO', {
      detalhe: 'Identidade validada no MV',
      ...meta,
    });

    return {
      token,
      nome: mascararNome(elegivel.nm_prestador ?? elegivel.nm_usuario),
      // A coluna OnePass não existe na base atual do MV — campo mantido como
      // informativo, sempre false até a integração ser disponibilizada.
      onepassIntegrado: false,
    };
  }

  /**
   * Etapa 2 — valida senha (política) e e-mail, grava o hash da senha e envia o
   * código de confirmação para o e-mail informado.
   */
  async enviarCodigoEmail(
    token: string,
    input: { email: string; senha: string; confirmacao: string },
    meta: RequestMeta = {},
  ): Promise<void> {
    const email = (input.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestError('E-mail inválido.');
    }
    if (input.senha !== input.confirmacao) {
      throw new BadRequestError('As senhas não coincidem.');
    }

    const cadastro = await this.obterCadastroValido(token);

    const motivos = validarPoliticaSenha(input.senha, { login: cadastro.cpf, nome: cadastro.nome });
    if (motivos.length > 0) {
      throw new UnprocessableEntityError(motivos.join(' '));
    }

    const emailExistente = await this.authRepo.findByEmail(email);
    if (emailExistente) {
      throw new ConflictError('Já existe uma conta com esse e-mail.');
    }

    const senhaHash = await hashPassword(input.senha);
    const codigo = String(crypto.randomInt(100000, 1000000));
    await this.medicoRepo.registrarDadosConta(cadastro.id, {
      email,
      senhaHash,
      codigoHash: hashToken(codigo),
      codigoExpiraEm: new Date(Date.now() + CODIGO_TTL_MS),
    });

    await this.authRepo.log('AUTOCADASTRO_MEDICO_CODIGO', {
      detalhe: 'Código de confirmação enviado',
      ...meta,
    });

    // TODO: integrar provedor de e-mail (Resend, SendGrid, etc.)
    console.log(`\n[EMAIL MOCK] Para: ${email} -> Código de confirmação: ${codigo}\n`);
  }

  /**
   * Etapa 3 — valida o código do e-mail e cria a conta MEDICO, emitindo a
   * sessão (login automático).
   */
  async concluirCadastro(token: string, codigo: string, meta: RequestMeta = {}): Promise<ConcluirCadastroResultado> {
    const cadastro = await this.obterCadastroValido(token);

    if (!cadastro.senha_hash || !cadastro.codigo_hash || !cadastro.email) {
      throw new UnprocessableEntityError('Sessão de cadastro inválida. Recomece o cadastro.');
    }

    const codigoNormalizado = (codigo || '').trim();
    if (!codigoNormalizado) {
      throw new BadRequestError('Código de confirmação é obrigatório.');
    }
    if (hashToken(codigoNormalizado) !== cadastro.codigo_hash) {
      throw new UnprocessableEntityError('Código inválido ou expirado.');
    }
    if (cadastro.codigo_expira_em && cadastro.codigo_expira_em.getTime() < Date.now()) {
      throw new UnprocessableEntityError('Código inválido ou expirado.');
    }

    // Revalida duplicidade imediatamente antes de criar (corrida entre etapas).
    if (await this.authRepo.findByCpf(cadastro.cpf)) {
      throw new ConflictError('Já existe uma conta vinculada a este cadastro.');
    }
    if (await this.authRepo.findByCdPrestador(cadastro.cd_prestador)) {
      throw new ConflictError('Já existe uma conta vinculada a este cadastro.');
    }

    const id = await this.authRepo.createUsuarioMedico({
      login: cadastro.cpf,
      senhaHash: cadastro.senha_hash,
      nome: cadastro.nome,
      email: cadastro.email,
      cpf: cadastro.cpf,
      cdPrestador: cadastro.cd_prestador,
      cdUsuarioMv: cadastro.cd_usuario_mv,
    });

    await this.medicoRepo.marcarUsado(cadastro.id);

    const refreshToken = generateRefreshToken();
    await this.authRepo.createSessao({
      usuarioId: id,
      refreshTokenHash: hashToken(refreshToken),
      expiraEm: novoRefreshExpira(),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    await this.authRepo.log('AUTOCADASTRO_MEDICO_OK', { usuarioId: id, ...meta });

    const accessToken = signAccessToken({
      sub: id,
      login: cadastro.cpf,
      perfil: 'MEDICO' as Perfil,
      nome: cadastro.nome ?? undefined,
    });

    const user: SafeUser = {
      id,
      login: cadastro.cpf,
      nome: cadastro.nome,
      email: cadastro.email,
      perfil: 'MEDICO',
    };

    return { user, accessToken, refreshToken };
  }

  // --- helpers privados ---

  private async obterCadastroValido(token: string) {
    if (!token) {
      throw new UnprocessableEntityError('Sessão de cadastro inválida. Recomece o cadastro.');
    }
    const cadastro = await this.medicoRepo.findByTokenHash(hashToken(token));
    if (!cadastro) {
      throw new UnprocessableEntityError('Sessão de cadastro inválida. Recomece o cadastro.');
    }
    if (cadastro.usado) {
      throw new ConflictError('Este cadastro já foi concluído.');
    }
    if (cadastro.expira_em.getTime() < Date.now()) {
      throw new UnprocessableEntityError('Sessão de cadastro expirada. Recomece o cadastro.');
    }
    return cadastro;
  }

  private selecionarElegivel(candidatos: PrestadorMV[], cpf: string, nascimentoInformado: string): PrestadorMV | undefined {
    const medicos = config.medicoCdTipPresta;
    return candidatos.find((c) => {
      if (c.cpf == null || c.cd_prestador == null || c.sn_ativo !== 'S') {
        return false;
      }
      // Se os códigos de médico estiverem configurados, exige correspondência.
      if (medicos.length > 0) {
        if (c.cd_tip_presta == null || !medicos.includes(String(c.cd_tip_presta))) {
          return false;
        }
      }
      if (!c.dt_nascimento) {
        return false;
      }
      return dataParaISO(new Date(c.dt_nascimento)) === nascimentoInformado;
    });
  }
}
