import { AnexoRepository } from './anexo.repository';
import fs from 'fs-extra';
import path from 'path';

export class AnexoService {
  private repo = new AnexoRepository();
  async upload(file: Express.Multer.File, data: {
    cd_paciente: number;
    cd_atendimento: number;
    id_exame: number;
    data: string;
    olho: string;
    observacoes: string;
    status: string;
  }) {
    const baseDir = '\\\\192.168.4.18\\C$\\anexos_exames';
    const targetDir = path.join(baseDir, data.cd_paciente.toString());
    const filename = `${data.cd_paciente}-${data.cd_atendimento}-${data.id_exame}-${data.data}.pdf`;
    const targetPath = path.join(targetDir, filename);


    await fs.ensureDir(targetDir);


    await fs.move(file.path, targetPath, { overwrite: true });


    await this.repo.saveAnexoExame({
      cd_paciente: data.cd_paciente,
      cd_atendimento: data.cd_atendimento,
      id_exame: data.id_exame,
      observacoes: data.observacoes,
      olho: data.olho,
      data: data.data,
      caminho_anexo: targetPath,
      statusdoc: data.status
    });
  }

  async listExames() {
    return this.repo.listExames();
  }
}
