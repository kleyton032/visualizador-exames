import { Request, Response } from 'express';
import { UsuariosService } from './usuarios.service';

function numQuery(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export class UsuariosController {
  private service = new UsuariosService();

  listar = async (req: Request, res: Response) => {
    try {
      const { busca, perfil, situacao, page, pageSize } = req.query || {};
      const result = await this.service.listar({
        busca: typeof busca === 'string' ? busca : undefined,
        perfil: typeof perfil === 'string' ? perfil : undefined,
        situacao: typeof situacao === 'string' ? situacao : undefined,
        page: numQuery(page),
        pageSize: numQuery(pageSize),
      });
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Erro ao listar usuários' });
    }
  };

  detalhar = async (req: Request, res: Response) => {
    try {
      const usuario = await this.service.detalhar(Number(req.params.id));
      return res.json({ usuario });
    } catch (error: any) {
      return res.status(404).json({ error: error.message || 'Usuário não encontrado' });
    }
  };

  atualizar = async (req: Request, res: Response) => {
    try {
      const { nome, email, perfil, situacao } = req.body || {};
      await this.service.atualizar(req.user!.id, Number(req.params.id), { nome, email, perfil, situacao });
      return res.json({ message: 'Usuário atualizado com sucesso' });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Erro ao atualizar usuário' });
    }
  };

  redefinirSenha = async (req: Request, res: Response) => {
    try {
      const meta = {
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      };
      const resultado = await this.service.redefinirSenha(req.user!.id, Number(req.params.id), meta);
      return res.json({
        message: 'Senha temporária gerada. Informe-a ao usuário (válida por 24 horas).',
        senhaTemporaria: resultado.senhaTemporaria,
        expiraEm: resultado.expiraEm,
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Erro ao redefinir senha' });
    }
  };

  auditoria = async (req: Request, res: Response) => {
    try {
      const registros = await this.service.auditoria(Number(req.params.id));
      return res.json({ registros });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Erro ao consultar auditoria' });
    }
  };
}
