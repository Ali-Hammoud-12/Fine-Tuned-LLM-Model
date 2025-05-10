FROM node:24-alpine AS builder

WORKDIR /app
COPY . .

# Set environment to production
ENV NODE_ENV=production

RUN npm install
RUN npm run build

# Serve using Next.js built-in server
FROM node:24-alpine AS runner
WORKDIR /app

COPY --from=builder /app /app
RUN npm install --omit=dev

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start"]
