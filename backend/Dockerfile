# ---- 1. Builder Stage ---- 
FROM node:20-alpine AS builder
WORKDIR /app

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# 1) ติดตั้ง deps (รวม dev) แต่ต้องมี prisma + prisma.config.ts ให้พร้อมก่อน postinstall
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# 2) ค่อย copy source ที่เหลือ
COPY tsconfig.json ./
COPY src ./src

# build: prisma generate && tsc
RUN npm run build


# ---- 2. Production Stage ----
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# 1) ต้องมี prisma + prisma.config.ts ก่อน เพราะ npm ci จะรัน postinstall (prisma generate)
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --omit=dev

# 2) copy code ที่ build แล้วจาก builder
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]