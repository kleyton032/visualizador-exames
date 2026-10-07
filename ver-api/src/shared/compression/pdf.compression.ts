import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { config } from '../config';

const execFileAsync = promisify(execFile);

/** Comprime um PDF usando Ghostscript (subprocesso, sem interpolação de shell). */
export async function compressPdf(inputPath: string): Promise<string> {
  const outputPath = path.join(
    path.dirname(inputPath),
    `${path.basename(inputPath, path.extname(inputPath))}-opt.pdf`,
  );

  await execFileAsync(
    'gs',
    [
      '-sDEVICE=pdfwrite',
      `-dPDFSETTINGS=${config.pdfSettings}`,
      '-dNOPAUSE',
      '-dBATCH',
      '-dQUIET',
      `-sOutputFile=${outputPath}`,
      inputPath,
    ],
    { timeout: 60000 },
  );

  return outputPath;
}
