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

  download = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const anexo = await this.service.getAnexoById(Number(id));

      if (!anexo) {
        return res.status(404).json({ error: 'Anexo não encontrado' });
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
      const { id } = req.params;
      const { status } = req.body;
      await this.service.updateStatus(Number(id), status);
      res.status(200).send();
    } catch (error: any) {
      console.error('Erro ao atualizar status do anexo:', error);
      res.status(500).json({ error: error.message });
    }
  };
}
