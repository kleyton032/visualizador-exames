import jwt from 'jsonwebtoken';
import { config } from '../config';
import { comparePassword, hashPassword } from './password';
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
