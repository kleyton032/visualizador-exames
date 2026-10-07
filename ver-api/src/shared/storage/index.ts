import { config } from '../config';
import { LocalStorage } from './local.storage';
import { S3Storage } from './s3.storage';
import { StorageService } from './storage.types';

let instance: StorageService | null = null;

/** Retorna o driver de storage ativo, conforme STORAGE_DRIVER (local | s3). */
export function getStorage(): StorageService {
  if (!instance) {
    instance = config.storageDriver === 's3' ? new S3Storage() : new LocalStorage();
  }
  return instance;
}

export type { StorageResolve, StorageService } from './storage.types';
