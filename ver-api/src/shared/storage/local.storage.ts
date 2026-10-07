import fs from 'fs-extra';
import path from 'path';
import { config } from '../config';
import { StorageResolve, StorageService } from './storage.types';

/** Driver de armazenamento local (disco/UNC) — comportamento original. */
export class LocalStorage implements StorageService {
  async save(file: Express.Multer.File, relativeKey: string): Promise<string> {
    const targetPath = path.normalize(path.join(config.anexosBaseDir, relativeKey));
    await fs.ensureDir(path.dirname(targetPath));
    await fs.move(file.path, targetPath, { overwrite: true });
    return targetPath;
  }

  async resolve(caminho: string): Promise<StorageResolve> {
    return { kind: 'file', value: caminho };
  }
}
