# ---- 1. Builder Stage ---- 
FROM node:20-alpine AS builder
WORKDIR /app

# ติดตั้ง dependencies (รวม dev)
COPY package.json package-lock.json ./
RUN npm ci

# ต้อง copy prisma ก่อน เพราะ build script ใช้ prisma generate
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

# build: prisma generate && tsc
RUN npm run build


# ---- 2. Production Stage ----
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# copy package file + prisma ก่อน เพื่อให้ postinstall (prisma generate) ใช้ได้
COPY package.json package-lock.json ./
COPY prisma ./prisma

# ติดตั้งเฉพาะ production deps (จะรัน postinstall → prisma generate)
RUN npm ci --omit=dev

# copy compiled code จาก builder
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]