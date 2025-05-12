FROM node:24-alpine AS builder

WORKDIR /app
COPY . .

# Accept environment variable at build time
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN echo "🔧 Building with NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"

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
