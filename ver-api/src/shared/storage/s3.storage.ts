import fs from 'fs-extra';
import path from 'path';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import { StorageResolve, StorageService } from './storage.types';

/** Driver de armazenamento no AWS S3 (bucket privado + URL pré-assinada). */
export class S3Storage implements StorageService {
  private client: S3Client;

  constructor() {
    this.client = new S3Client({ region: config.awsRegion });
  }

  async save(file: Express.Multer.File, relativeKey: string): Promise<string> {
    const key = `anexos/${relativeKey.replace(/\\/g, '/')}`;

    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: config.s3Bucket,
        Key: key,
        Body: fs.createReadStream(file.path),
        ContentType: file.mimetype,
      },
    });

    await upload.done();
    await fs.remove(file.path); // remove o temporário do multer

    return `s3://${config.s3Bucket}/${key}`;
  }

  async resolve(caminho: string, opcoes?: { download?: boolean }): Promise<StorageResolve> {
    const key = caminho.replace(/^s3:\/\/[^/]+\//, '');

    const command = new GetObjectCommand({
      Bucket: config.s3Bucket,
      Key: key,
      ...(opcoes?.download
        ? { ResponseContentDisposition: `attachment; filename="${path.basename(key)}"` }
        : {}),
    });

    const url = await getSignedUrl(this.client, command, { expiresIn: config.s3PresignTtl });
    return { kind: 'url', value: url };
  }
}
