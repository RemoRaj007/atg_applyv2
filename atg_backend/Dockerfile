# ATG Apply — Backend (Express + Prisma)
#
# Configuration is provided at runtime via env vars (see docker-compose.yml's
# `env_file`), never baked into the image.

FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY prisma ./prisma
RUN npx prisma generate

FROM node:22-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY . .

EXPOSE 5000
CMD ["node", "atg_server.js"]
