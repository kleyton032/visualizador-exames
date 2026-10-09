import type { Readable } from 'stream';

export interface StorageResolve {
  kind: 'file' | 'url';
  value: string;
}

export interface StorageFile {
  stream: Readable;
  contentType?: string;
  contentLength?: number;
}

export interface StorageService {
  /** Salva o arquivo e retorna o identificador (caminho local ou s3://bucket/key). */
  save(file: Express.Multer.File, relativeKey: string): Promise<string>;
  /** Resolve o identificador em caminho local (kind=file) ou URL pré-assinada (kind=url). */
  resolve(caminho: string, opcoes?: { download?: boolean }): Promise<StorageResolve>;
  /** Abre o arquivo como stream (usado pelo visualizador, same-origin, sem CORS). */
  open(caminho: string): Promise<StorageFile>;
}
