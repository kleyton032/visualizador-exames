import { AnexoRepository } from './anexo.repository';
import fs from 'fs-extra';
import path from 'path';

export class AnexoService {
  private repo = new AnexoRepository();

  constructor() {
    this.repo = new AnexoRepository();
  }

  async upload(file: Express.Multer.File, data: {
    cd_paciente: number;
    cd_atendimento: number;
    id_exame: number;
    data: string | Date;
    olho: string;
    observacoes: string;
    status: string;
  }) {
    const examen = await this.repo.getExameById(data.id_exame);
    const nomeExame = examen ? (examen as any).NOME_EXAME : data.id_exame;

    const baseDir = '\\\\192.168.4.18\\C$\\anexos_exames';
    const extension = path.extname(file.originalname);
    const targetDir = path.normalize(path.join(baseDir, data.cd_paciente.toString()));
    const filename = `${data.cd_paciente}-${data.cd_atendimento}-${nomeExame}-${data.data}${extension}`;
    const targetPath = path.normalize(path.join(targetDir, filename));

    console.log('UPLOAD - Gravando arquivo em:', targetPath);
    console.log('UPLOAD - Nome do Exame:', nomeExame);
    console.log('UPLOAD - Data recebida:', data.data);


    await fs.ensureDir(targetDir);


    await fs.move(file.path, targetPath, { overwrite: true });


    await this.repo.saveAnexoExame({
      cd_paciente: data.cd_paciente,
      cd_atendimento: data.cd_atendimento,
      id_exame: data.id_exame,
      olho: data.olho,
      data: new Date(),
      caminho_anexo: targetPath,
      statusdoc: data.status,
      observacoes: data.observacoes
    });
  }

  async listExames() {
    return this.repo.listExames();
  }

  async getAnexoById(id: number) {
    return this.repo.getAnexoById(id);
  }
}
