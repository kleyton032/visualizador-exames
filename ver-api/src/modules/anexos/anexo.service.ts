import { AnexoRepository } from './anexo.repository';
import { getStorage } from '../../shared/storage';
import { optimize } from '../../shared/compression';
import fs from 'fs-extra';
import path from 'path';

export interface UploadUsuario {
  id: number;
  login?: string;
}

/** Remove acentos e caracteres especiais para montar um nome de arquivo seguro no S3. */
function sanitizeNome(texto: string): string {
  const sanitizado = texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);

  return sanitizado || 'EXAME';
}

export class AnexoService {
  private repo = new AnexoRepository();

  async upload(
    file: Express.Multer.File,
    data: {
      cd_paciente: number;
      cd_atendimento: number;
      id_exame: number;
      data: string | Date;
      olho: string;
      observacoes: string;
      status: string;
    },
    usuario?: UploadUsuario,
  ): Promise<number> {
    const exame = await this.repo.getExameById(data.id_exame);
    const tipoExame = exame ? exame.tipo : String(data.id_exame);

    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `${data.cd_paciente}-${data.cd_atendimento}-${sanitizeNome(tipoExame)}-${data.data}${extension}`;
    const relativeKey = path.join(String(data.cd_paciente), filename);

    // Comprime (se aplicável) antes de enviar ao storage
    const otimizado = await optimize(file.path, file.mimetype);
    const uploadFile = otimizado.optimized
      ? { ...file, path: otimizado.path, size: otimizado.size }
      : file;

    const storage = getStorage();

    let caminho: string;
    try {
      caminho = await storage.save(uploadFile, relativeKey);
    } catch (err: any) {
      await this.repo.registrarAuditoria(null, 'ERRO', err.message);
      throw err;
    } finally {
      // limpa temporários não consumidos pelo storage
      await fs.remove(file.path);
      if (otimizado.optimized) {
        await fs.remove(otimizado.path);
      }
    }

    const anexoId = await this.repo.createAnexo({
      cd_paciente: data.cd_paciente,
      cd_atendimento: data.cd_atendimento,
      id_exame: data.id_exame,
      tipo_exame: tipoExame,
      olho: data.olho,
      observacoes: data.observacoes,
      nome_arquivo: file.originalname,
      content_type: file.mimetype,
      tamanho_bytes: uploadFile.size,
      caminho_anexo: caminho,
      statusdoc: data.status,
      usuario_id: usuario?.id ?? null,
    });

    await this.repo.registrarAuditoria(anexoId, 'SUCESSO');

    return anexoId;
  }

  async listExames() {
    return this.repo.listExames();
  }

  async getAnexoById(id: number) {
    return this.repo.getAnexoById(id);
  }

  async resolveAnexo(caminho: string, download = false) {
    return getStorage().resolve(caminho, { download });
  }

  async updateStatus(id: number, status: string) {
    return this.repo.updateStatus(id, status);
  }
}
