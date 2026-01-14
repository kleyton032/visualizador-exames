import { Request, Response } from 'express';
import { AnexoService } from './anexo.service';
import path from 'path';
import fs from 'fs';

export class AnexoController {
  private service = new AnexoService();

  listExames = async (req: Request, res: Response) => {
    const exames = await this.service.listExames();
    res.json(exames);
  };

  upload = async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { cd_paciente, cd_atendimento, id_exame, data, olho, observacoes, status } = req.body;

    await this.service.upload(req.file, {
      cd_paciente: Number(cd_paciente),
      cd_atendimento: Number(cd_atendimento),
      id_exame: Number(id_exame),
      data: data,
      olho: olho,
      observacoes: observacoes,
      status: status
    });

    res.status(201).send();
  };

  view = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      console.log('Tentando abrir anexo ID:', id);

      const anexo = await this.service.getAnexoById(Number(id));
      console.log('Resultado do banco:', anexo);

      if (!anexo) {
        return res.status(404).json({ error: 'Anexo não encontrado no banco de dados' });
      }

      let filePath = (anexo as any).CAMINHO_ANEXO;
      filePath = path.normalize(filePath);
      const parentDir = path.dirname(filePath);
      const baseShare = '\\\\192.168.4.18\\C$';

      console.log('--- DIAGNÓSTICO DE ARQUIVO ---');
      console.log('Base Share exists:', fs.existsSync(baseShare));
      console.log('Parent Dir exists:', fs.existsSync(parentDir));
      console.log('File exists:', fs.existsSync(filePath));

      if (!fs.existsSync(filePath) && fs.existsSync(parentDir)) {
        const files = fs.readdirSync(parentDir);
        console.log('Arquivos encontrados no diretório:', files);
      }
      console.log('------------------------------');

      if (!fs.existsSync(filePath)) {
        let errorMsg = `Arquivo físico não encontrado no servidor: ${filePath}`;
        if (!fs.existsSync(parentDir)) {
          errorMsg = `Diretório do paciente não encontrado ou sem acesso: ${parentDir}`;
        }
        if (!fs.existsSync(baseShare)) {
          errorMsg = `Não foi possível acessar o compartilhamento base: ${baseShare}. Verifique permissões de rede.`;
        }
        return res.status(404).json({ error: errorMsg });
      }

      res.sendFile(filePath, (err) => {
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

  inativar = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.service.inativarAnexo(Number(id));
      res.status(200).send();
    } catch (error: any) {
      console.error('Erro ao inativar anexo:', error);
      res.status(500).json({ error: error.message });
    }
  };
}
