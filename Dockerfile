FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY src ./src
COPY web ./web
COPY tsconfig.json ./

ENV HOST=0.0.0.0
ENV PORT=4321
ENV JOB_SCRAPER_DATA_DIR=/data

RUN mkdir -p /data

EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "const r = await fetch('http://127.0.0.1:' + (process.env.PORT || 4321) + '/api/health'); if (!r.ok) process.exit(1);"

CMD ["bun", "--conditions=job-scraper-source", "web/server.ts"]
