import jwt from 'jsonwebtoken';
import { config } from '../config';
import {
  comparePassword,
  gerarSenhaTemporaria,
  hashPassword,
  senhaAtendePolitica,
  SENHA_MIN_CARACTERES,
  validarPoliticaSenha,
} from './password';
import { signAccessToken, verifyAccessToken } from './jwt';
import { generateRefreshToken, hashToken } from './token';

describe('security/password', () => {
  it('gera hash diferente da senha e valida com compare', async () => {
    const hash = await hashPassword('senhaSegura123');
    expect(hash).not.toBe('senhaSegura123');
    expect(await comparePassword('senhaSegura123', hash)).toBe(true);
    expect(await comparePassword('senhaErrada', hash)).toBe(false);
  });

  it('gera hash diferente a cada execução (salt aleatório)', async () => {
    const a = await hashPassword('mesmaSenha');
    const b = await hashPassword('mesmaSenha');
    expect(a).not.toBe(b);
  });
});

describe('security/password — política de senha', () => {
  it('aceita senha forte (10+ chars, maiúscula, minúscula, número e símbolo)', () => {
    expect(validarPoliticaSenha('SenhaFort3!')).toEqual([]);
    expect(senhaAtendePolitica('SenhaFort3!')).toBe(true);
  });

  it('rejeita senha curta', () => {
    const motivos = validarPoliticaSenha('Ab1!');
    expect(motivos.some((m) => m.includes(SENHA_MIN_CARACTERES))).toBe(true);
  });

  it('rejeita senha sem cada classe obrigatória', () => {
    expect(validarPoliticaSenha('senhaforte1!').join(' ')).toContain('letra maiúscula');
    expect(validarPoliticaSenha('SENHAFORTE1!').join(' ')).toContain('letra minúscula');
    expect(validarPoliticaSenha('SenhaForte!').join(' ')).toContain('número');
    expect(validarPoliticaSenha('SenhaForte1').join(' ')).toContain('símbolo');
  });

  it('rejeita senha que contém o login ou partes do nome', () => {
    expect(validarPoliticaSenha('SenhaFort3!', { login: 'senha' }).join(' ')).toContain('não pode conter o login');
    expect(validarPoliticaSenha('MariaFort3!', { nome: 'Maria da Silva' }).join(' ')).toContain('não pode conter o nome');
    expect(validarPoliticaSenha('SenhaFort3!', { login: 'outro', nome: 'João' })).toEqual([]);
  });
});

describe('security/password — senha temporária', () => {
  it('gera senha com as quatro classes de caracteres e comprimento mínimo', () => {
    const senha = gerarSenhaTemporaria();
    expect(senha.length).toBeGreaterThanOrEqual(SENHA_MIN_CARACTERES);
    expect(senhaAtendePolitica(senha)).toBe(true);
  });

  it('gera senhas distintas (aleatoriedade)', () => {
    const a = gerarSenhaTemporaria();
    const b = gerarSenhaTemporaria();
    expect(a).not.toBe(b);
  });

  it('não gera caracteres ambíguos (0/O, 1/l/I)', () => {
    const senha = gerarSenhaTemporaria(64);
    expect(senha).not.toMatch(/[0O1lI]/);
  });

  it('respeita comprimento customizado', () => {
    expect(gerarSenhaTemporaria(16)).toHaveLength(16);
  });
});

describe('security/jwt', () => {
  it('assina e verifica o token', () => {
    const token = signAccessToken({ sub: 1, login: 'admin', perfil: 'ADMIN', nome: 'Admin' });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe(1);
    expect(payload.login).toBe('admin');
    expect(payload.perfil).toBe('ADMIN');
    expect(payload.nome).toBe('Admin');
  });

  it('rejeita token adulterado', () => {
    const token = signAccessToken({ sub: 1, login: 'admin', perfil: 'ADMIN' });
    expect(() => verifyAccessToken(token + 'x')).toThrow();
  });

  it('rejeita token expirado', () => {
    const expirado = jwt.sign(
      { sub: 1, login: 'a', perfil: 'ADMIN' },
      config.jwtSecret,
      { expiresIn: '-1s' },
    );
    expect(() => verifyAccessToken(expirado)).toThrow();
  });
});

describe('security/token', () => {
  it('gera tokens opacos distintos e hash determinístico (SHA-256 hex 64 chars)', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a).not.toBe(b);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).not.toBe(hashToken(b));
    expect(hashToken(a)).toHaveLength(64);
  });
});
