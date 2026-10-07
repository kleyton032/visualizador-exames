import fs from 'fs-extra';
import { config } from '../config';
import { compressImage } from './image.compression';
import { compressPdf } from './pdf.compression';

export interface CompressResult {
  path: string;
  size: number;
  optimized: boolean;
}

const SUPPORTED_IMAGES = ['image/jpeg', 'image/png'];

/**
 * Orquestra a compressão: só comprime acima do limite configurado e faz
 * fallback para o arquivo original em caso de erro ou se não houver redução.
 */
export async function optimize(filePath: string, mimetype: string): Promise<CompressResult> {
  const stat = await fs.stat(filePath);
  const size = stat.size;

  if (!config.compressionEnabled || size < config.compressionMinBytes) {
    return { path: filePath, size, optimized: false };
  }

  try {
    let optimizedPath: string;

    if (mimetype === 'application/pdf') {
      optimizedPath = await compressPdf(filePath);
    } else if (SUPPORTED_IMAGES.includes(mimetype)) {
      optimizedPath = await compressImage(filePath, mimetype);
    } else {
      return { path: filePath, size, optimized: false };
    }

    const optimizedStat = await fs.stat(optimizedPath);

    // Se não reduziu (ou aumentou), mantém o original
    if (optimizedStat.size >= size) {
      await fs.remove(optimizedPath);
      console.log(`[compress] ${mimetype}: ${size}B -> ${optimizedStat.size}B (sem redução; mantendo original)`);
      return { path: filePath, size, optimized: false };
    }

    console.log(
      `[compress] ${mimetype}: ${size}B -> ${optimizedStat.size}B (${Math.round((1 - optimizedStat.size / size) * 100)}% menor)`,
    );
    return { path: optimizedPath, size: optimizedStat.size, optimized: true };
  } catch (err: any) {
    console.warn(`[compress] falhou (${mimetype}):`, err?.message || err);
    return { path: filePath, size, optimized: false };
  }
}
