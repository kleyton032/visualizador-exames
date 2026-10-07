# Plano de Implementação — Compressão de Anexos (Ghostscript + Sharp)

> Status: **implementado (2026-10-07).**
> Data: 2026-10-07

---

## 1. Objetivo

Reduzir o tamanho dos arquivos (PDF e imagens) **antes** de enviá-los ao storage (S3/local), sem perda perceptível de qualidade, economizando armazenamento, custo e tempo de visualização.

---

## 2. Decisões de arquitetura (recomendações)

| Decisão | Recomendação | Justificativa |
|---|---|---|
| Imagens (JPG/PNG) | **`sharp`** (libvips) | Rápido, baixo uso de memória, binários pré-compilados, licença Apache 2.0. |
| PDFs | **Ghostscript (`gs`)** no container | Padrão da indústria; re-comprime as imagens internas do PDF. |
| Formato de saída das imagens | Mantém JPG/PNG (re-encode com qualidade) | Evita surpresas de compatibilidade; WebP é opcional futuro. |
| Quando comprimir | Somente arquivos **acima de um limite** (ex.: 500 KB) | Evita gastar CPU em arquivos já pequenos. |
| Fluxo | Síncrono no upload, em **arquivo temporário** | Uploads são esporádicos; mantém a implementação simples. |
| Falha na compressão | **Fallback**: envia o arquivo original | Nunca bloquear um upload por falha do compressor. |
| Configuração | Parâmetros via `.env` | Facilita ajuste sem recompilar. |

---

## 3. Fluxo

```mermaid
flowchart LR
    U[Upload recebido] -->|multer| T[Arquivo temporário]
    T --> S{Tamanho > limite?}
    S -- não --> ST[Storage]
    S -- sim --> C{Tipo?}
    C -- imagem --> SH[sharp re-encode]
    C -- pdf --> GS[ghostscript /ebook]
    SH --> O[Arquivo otimizado temporário]
    GS --> O
    O -->|sucesso| ST[Storage (S3/local)]
    O -->|erro| T2[Usa arquivo original]
    ST --> D[Apaga temporários]
    D --> R[Registra no Postgres + auditoria]
```

---

## 4. Estrutura de arquivos proposta

```
ver-api/src/
└── shared/
    └── compression/
        ├── compressor.ts          # detecta tipo, decide e orquestra (com fallback)
        ├── image.compression.ts   # sharp (jpeg/png)
        └── pdf.compression.ts     # ghostscript (subprocess)
```

---

## 5. Dependências e imagem Docker

```bash
npm i sharp
```

No `ver-api/Dockerfile` (estágio runtime), instalar o Ghostscript:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends ghostscript && \
    rm -rf /var/lib/apt/lists/*
```

> Aumento esperado da imagem: ~100 MB (ghostscript). O `sharp` usa binários pré-compilados via npm (sem compilação local).

---

## 6. Configuração (`.env`)

```env
# Compressão de anexos
COMPRESSION_ENABLED=true
COMPRESSION_MIN_BYTES=500000      # 500 KB
IMAGE_QUALITY=80                  # 0-100 (sharp)
PDF_SETTINGS=/screen              # /screen, /ebook, /printer, /prepress
```

> No `docker-compose.yml`, repassar essas variáveis ao serviço `api` (como as demais).

---

## 7. Mudanças no código

### 7.1 `shared/compression/image.compression.ts`
- Recebe o caminho temporário e o MIME.
- `sharp(input).jpeg({ quality, mozjpeg: true })` para JPEG.
- `sharp(input).png({ quality, palette: true })` para PNG.
- Escreve num arquivo temporário otimizado e retorna o novo caminho + tamanho.

### 7.2 `shared/compression/pdf.compression.ts`
- Executa via `child_process.execFile`:
  ```bash
  gs -sDEVICE=pdfwrite -dPDFSETTINGS=/ebook -dNOPAUSE -dBATCH -dQUIET -sOutputFile=saida.pdf entrada.pdf
  ```
- Timeout (ex.: 60 s) e captura de erro.
- Se o PDF já estiver pequeno/otimizado, o `gs` pode devolver um arquivo parecido — aceitável.

### 7.3 `shared/compression/compressor.ts`
- `optimizar(file, tipo): Promise<{ caminho, bytes }>`:
  1. Verifica `COMPRESSION_ENABLED` e tamanho mínimo.
  2. Chama o compressor específico por MIME.
  3. Em erro, retorna o arquivo original (fallback).

### 7.4 `anexo.service.ts`
- Antes de `storage.save(...)`, chama `compressor.optimizar(...)`.
- Envia o arquivo otimizado ao storage; ao final, remove os temporários (multer + otimizado).

---

## 8. Fases de implementação

| Fase | Atividade |
|---|---|
| 0 | Aprovar decisões (seção 2) |
| 1 | Instalar `sharp` + adicionar `ghostscript` ao Dockerfile |
| 2 | Criar `shared/compression/*` (sharp, gs, orquestrador) |
| 3 | Integrar no `anexo.service.ts` (antes do storage) |
| 4 | Configurar `.env`/compose (`COMPRESSION_*`) |
| 5 | Testes (unitários com fake/mock) + validação manual (upload grande → conferir tamanho no bucket) |
| 6 | Documentação e commit |

---

## 9. Segurança e robustez

- **Fallback**: se o `gs`/`sharp` falhar, o upload segue com o original (nunca perde o anexo).
- **Timeout** no subprocesso do Ghostscript.
- **Validação de MIME/lista branca** (só `pdf`, `jpeg`, `png` — já limitado no frontend e no multer).
- **Arquivos temporários** são apagados em `finally`.
- **Sem shell injection**: `execFile` com array de argumentos (sem interpolação de shell).
- Licenciamento: Ghostscript (AGPL) usado como processo separado em servidor próprio — ok para uso interno; atenção apenas se for redistribuído comercialmente.

---

## 10. Decisões confirmadas

1. **Limite de tamanho** → ✅ 500 KB.
2. **Qualidade PDF** → ✅ `/screen` (72 dpi — compressão máxima, ideal para visualização em tela).
3. **Formato** → ✅ manter o formato original do arquivo (JPG→JPG, PNG→PNG, PDF→PDF).
4. **Execução** → ✅ síncrono no upload.
