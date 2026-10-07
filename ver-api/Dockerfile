# ===================== BUILD =====================
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ===================== RUNTIME =====================
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

# Oracle Instant Client (necessário para o Thick mode com bancos Oracle antigos)
RUN apt-get update && apt-get install -y --no-install-recommends libaio1 ca-certificates curl unzip ghostscript && \
    mkdir -p /opt/oracle && \
    curl -sL -o /tmp/instantclient.zip "https://download.oracle.com/otn_software/linux/instantclient/2115000/instantclient-basiclite-linux.x64-21.15.0.0.0dbru.zip" && \
    unzip -q /tmp/instantclient.zip -d /opt/oracle && \
    rm -f /tmp/instantclient.zip && \
    apt-get purge -y --auto-remove curl unzip && \
    rm -rf /var/lib/apt/lists/*

ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_21_15 \
    ORACLE_CLIENT_DIR=/opt/oracle/instantclient_21_15

COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/server.js"]
