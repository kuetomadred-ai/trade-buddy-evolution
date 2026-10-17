FROM oven/bun:1.4.3

WORKDIR /app
COPY backend/package.json backend/bun.lock ./
RUN bun install --frozen-lockfile
COPY backend/tsconfig.json ./tsconfig.json
COPY backend/src ./src
RUN bun run typecheck

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "run", "start"]
