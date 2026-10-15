import { NextFunction, Request, Response } from 'express';
import { MedicoCadastroService } from './medico.service';
import {
  accessTokenCookieOptions,
  cookieNames,
  refreshTokenCookieOptions,
} from '../../shared/security/cookies';

export class MedicoController {
  private service = new MedicoCadastroService();

  private meta(req: Request) {
    return {
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    };
  }

  iniciarCadastro = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cpf, dataNascimento } = req.body || {};
      if (!cpf || !dataNascimento) {
        return res.status(400).json({ error: 'CPF e data de nascimento são obrigatórios.', code: 'BAD_REQUEST' });
      }

      const resultado = await this.service.iniciarCadastro(cpf, dataNascimento, this.meta(req));
      return res.json(resultado);
    } catch (error) {
      return next(error);
    }
  };

  enviarCodigoEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, email, senha, confirmacao } = req.body || {};
      if (!token || !email || !senha || !confirmacao) {
        return res.status(400).json({ error: 'Token, e-mail, senha e confirmação são obrigatórios.', code: 'BAD_REQUEST' });
      }

      await this.service.enviarCodigoEmail(token, { email, senha, confirmacao }, this.meta(req));
      return res.json({ message: 'Código de confirmação enviado para o e-mail informado.' });
    } catch (error) {
      return next(error);
    }
  };

  concluirCadastro = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, codigo } = req.body || {};
      if (!token || !codigo) {
        return res.status(400).json({ error: 'Token e código são obrigatórios.', code: 'BAD_REQUEST' });
      }

      const resultado = await this.service.concluirCadastro(token, codigo, this.meta(req));
      res.cookie(cookieNames.access, resultado.accessToken, accessTokenCookieOptions());
      res.cookie(cookieNames.refresh, resultado.refreshToken, refreshTokenCookieOptions());
      return res.json({ user: resultado.user });
    } catch (error) {
      return next(error);
    }
  };
}
