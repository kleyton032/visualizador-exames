import { Request, Response } from 'express';
import { AnexoService } from './anexo.service';

export class AnexoController {
  private service = new AnexoService();

  listExames = async (req: Request, res: Response) => {
    try {
      const exames = await this.service.listExames();
      res.json(exames);
    } catch (error: any) {
      console.error('Erro ao listar exames:', error);
      res.status(500).json({ error: error.message });
    }
  };

  listarPorPaciente = async (req: Request, res: Response) => {
    try {
      const cdPaciente = Number(req.params.cd_paciente);
      if (!Number.isInteger(cdPaciente) || cdPaciente <= 0) {
        return res.status(400).json({ error: 'Prontuário inválido' });
      }

      const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
      const pageSize = Math.max(1, parseInt(String(req.query.pageSize), 10) || 20);
      const status = req.query.status ? String(req.query.status).toUpperCase() : undefined;

      if (status && status !== 'A' && status !== 'B') {
        return res.status(400).json({ error: 'Status inválido' });
      }

      const result = await this.service.listarExamesPorPaciente(cdPaciente, {
        page,
        pageSize,
        status,
      });
      res.json(result);
    } catch (error: any) {
      console.error('Erro ao listar exames do paciente:', error);
      res.status(500).json({ error: error.message });
    }
  };

  upload = async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { cd_paciente, cd_atendimento, id_exame, data, olho, observacoes, status } = req.body;

    try {
      await this.service.upload(
        req.file,
        {
          cd_paciente: Number(cd_paciente),
          cd_atendimento: Number(cd_atendimento),
          id_exame: Number(id_exame),
          data: data,
          olho: olho,
          observacoes: observacoes,
          status: status,
        },
        req.user ? { id: req.user.id, login: req.user.login } : undefined,
      );
      res.status(201).send();
    } catch (error: any) {
      console.error('Erro ao fazer upload do anexo:', error);
      res.status(500).json({ error: error.message });
    }
  };

  view = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const anexo = await this.service.getAnexoById(Number(id));

      if (!anexo) {
        return res.status(404).json({ error: 'Anexo não encontrado' });
      }

      if (anexo.STATUSDOC === 'B') {
        return res.status(403).json({ error: 'Exame bloqueado e indisponível para visualização.' });
      }

      const resolved = await this.service.resolveAnexo(anexo.CAMINHO_ANEXO, false);

      if (resolved.kind === 'url') {
        return res.redirect(resolved.value);
      }
      return res.sendFile(resolved.value, (err) => {
        if (err) {
          console.error('Erro ao enviar arquivo:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: `Erro ao abrir o arquivo: ${err.message}` });
          }
        }
      });
    } catch (error: any) {
      console.error('Erro interno na rota view:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /** Transmite o arquivo pela própria API (mesma origem) para o visualizador, sem depender de CORS do S3. */
  stream = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const file = await this.service.openAnexo(Number(id));

      if (!file) {
        return res.status(404).json({ error: 'Anexo não encontrado' });
      }

      if (file.statusdoc === 'B') {
        return res.status(403).json({ error: 'Exame bloqueado e indisponível para visualização.' });
      }

      res.setHeader('Content-Type', file.contentType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.nomeArquivo ?? 'exame')}"`);
      if (file.contentLength) {
        res.setHeader('Content-Length', String(file.contentLength));
      }

      file.stream.on('error', (err: Error) => {
        console.error('Erro ao transmitir arquivo:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: err.message });
        } else {
          res.end();
        }
      });
      file.stream.pipe(res);
    } catch (error: any) {
      console.error('Erro interno na rota stream:', error);
      res.status(500).json({ error: error.message });
    }
  };

  download = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const anexo = await this.service.getAnexoById(Number(id));

      if (!anexo) {
        return res.status(404).json({ error: 'Anexo não encontrado' });
      }

      if (anexo.STATUSDOC === 'B') {
        return res.status(403).json({ error: 'Exame bloqueado e indisponível para download.' });
      }

      const resolved = await this.service.resolveAnexo(anexo.CAMINHO_ANEXO, true);

      if (resolved.kind === 'url') {
        return res.redirect(resolved.value);
      }

      return res.download(resolved.value);
    } catch (error: any) {
      console.error('Erro na rota download:', error);
      res.status(500).json({ error: error.message });
    }
  };

  updateStatus = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Anexo inválido' });
      }

      const { status, motivo, substituidoPorId } = req.body ?? {};
      const usuario = req.user ? { id: req.user.id, login: req.user.login } : undefined;

      if (status === 'B') {
        const resultado = await this.service.bloquearExame(
          id,
          motivo,
          usuario,
          substituidoPorId ? Number(substituidoPorId) : undefined,
        );
        if (resultado === null) {
          return res.status(404).json({ error: 'Anexo não encontrado' });
        }
      } else if (status === 'A') {
        const resultado = await this.service.reativarExame(id);
        if (resultado === null) {
          return res.status(404).json({ error: 'Anexo não encontrado' });
        }
      } else {
        return res.status(400).json({ error: 'Status inválido' });
      }

      res.status(200).send();
    } catch (error: any) {
      const mensagem = error?.message ?? 'Erro ao atualizar status do anexo';
      const regraDeNegocio = /^(Informe o motivo|O exame substituto|Exame substituto)/.test(mensagem);
      if (!regraDeNegocio) {
        console.error('Erro ao atualizar status do anexo:', error);
      }
      res.status(regraDeNegocio ? 400 : 500).json({ error: mensagem });
    }
  };
}
