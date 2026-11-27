FROM node:22-alpine AS base
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "npx prisma db push && npx tsx prisma/seed.ts && npm start"]
