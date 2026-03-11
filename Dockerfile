FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl sqlite3 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma client
RUN npx prisma generate --schema=server/prisma/schema.prisma

# Build the frontend
RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "server"]
