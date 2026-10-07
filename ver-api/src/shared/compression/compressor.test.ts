import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { optimize } from './compressor';
import { compressImage } from './image.compression';
import { compressPdf } from './pdf.compression';

jest.mock('../config', () => ({
  config: {
    compressionEnabled: true,
    compressionMinBytes: 500,
    imageQuality: 80,
    pdfSettings: '/screen',
  },
}));

jest.mock('./image.compression', () => ({ compressImage: jest.fn() }));
jest.mock('./pdf.compression', () => ({ compressPdf: jest.fn() }));

const mockedCompressImage = compressImage as jest.MockedFunction<typeof compressImage>;
const mockedCompressPdf = compressPdf as jest.MockedFunction<typeof compressPdf>;

describe('compressor.optimize', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ver-compress-'));
    jest.clearAllMocks();
  });

  afterEach(() => {
    fs.removeSync(tmpDir);
  });

  it('não comprime arquivos abaixo do limite', async () => {
    const file = path.join(tmpDir, 'pequena.jpg');
    await fs.writeFile(file, Buffer.alloc(100));

    const result = await optimize(file, 'image/jpeg');

    expect(result.optimized).toBe(false);
    expect(result.path).toBe(file);
    expect(mockedCompressImage).not.toHaveBeenCalled();
  });

  it('comprime imagem e usa o otimizado quando reduz', async () => {
    const file = path.join(tmpDir, 'grande.jpg');
    await fs.writeFile(file, Buffer.alloc(1000));

    const opt = path.join(tmpDir, 'grande-opt.jpg');
    await fs.writeFile(opt, Buffer.alloc(300));
    mockedCompressImage.mockResolvedValue(opt);

    const result = await optimize(file, 'image/jpeg');

    expect(result.optimized).toBe(true);
    expect(result.path).toBe(opt);
    expect(result.size).toBe(300);
  });

  it('usa o original se a compressão não reduzir', async () => {
    const file = path.join(tmpDir, 'grande.jpg');
    await fs.writeFile(file, Buffer.alloc(1000));

    const opt = path.join(tmpDir, 'grande-opt.jpg');
    await fs.writeFile(opt, Buffer.alloc(1500));
    mockedCompressImage.mockResolvedValue(opt);

    const result = await optimize(file, 'image/jpeg');

    expect(result.optimized).toBe(false);
    expect(result.path).toBe(file);
  });

  it('comprime PDF via ghostscript', async () => {
    const file = path.join(tmpDir, 'grande.pdf');
    await fs.writeFile(file, Buffer.alloc(1000));

    const opt = path.join(tmpDir, 'grande-opt.pdf');
    await fs.writeFile(opt, Buffer.alloc(200));
    mockedCompressPdf.mockResolvedValue(opt);

    const result = await optimize(file, 'application/pdf');

    expect(result.optimized).toBe(true);
    expect(result.path).toBe(opt);
  });

  it('faz fallback para o original se a compressão falhar', async () => {
    const file = path.join(tmpDir, 'grande.pdf');
    await fs.writeFile(file, Buffer.alloc(1000));
    mockedCompressPdf.mockRejectedValue(new Error('gs não encontrado'));

    const result = await optimize(file, 'application/pdf');

    expect(result.optimized).toBe(false);
    expect(result.path).toBe(file);
  });

  it('não comprime tipos não suportados', async () => {
    const file = path.join(tmpDir, 'arquivo.txt');
    await fs.writeFile(file, Buffer.alloc(1000));

    const result = await optimize(file, 'text/plain');

    expect(result.optimized).toBe(false);
  });
});
