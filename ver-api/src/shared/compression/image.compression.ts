import path from 'path';
import sharp from 'sharp';
import { config } from '../config';

/** Comprime uma imagem (JPEG/PNG) mantendo o formato original. */
export async function compressImage(inputPath: string, mimetype: string): Promise<string> {
  const isPng = mimetype === 'image/png';
  const outputPath = path.join(
    path.dirname(inputPath),
    `${path.basename(inputPath, path.extname(inputPath))}-opt${isPng ? '.png' : '.jpg'}`,
  );

  let pipeline = sharp(inputPath).rotate(); // aplica a orientação EXIF

  if (isPng) {
    pipeline = pipeline.png({ quality: config.imageQuality, palette: true });
  } else {
    pipeline = pipeline.jpeg({ quality: config.imageQuality, mozjpeg: true });
  }

  await pipeline.toFile(outputPath);
  return outputPath;
}
