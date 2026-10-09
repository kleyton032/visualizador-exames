export interface StorageResolve {
  kind: 'file' | 'url';
  value: string;
}

export interface StorageService {
  /** Salva o arquivo e retorna o identificador (caminho local ou s3://bucket/key). */
  save(file: Express.Multer.File, relativeKey: string): Promise<string>;
  /** Resolve o identificador em caminho local (kind=file) ou URL pré-assinada (kind=url). */
  resolve(caminho: string, opcoes?: { download?: boolean }): Promise<StorageResolve>;
}
