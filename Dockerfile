FROM node:22-slim

WORKDIR /app

# Install production & build dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy application source & cached FITS assets
COPY . .

# Build Vite frontend + esbuild Express backend (server.js)
RUN npm run build

# Cloud Run listens on $PORT (defaults to 8080 if not set)
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
