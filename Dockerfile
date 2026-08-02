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

# Apply pending migrations before booting. `migrate deploy` only runs migrations that
# have not been applied yet, so a restart on an up-to-date database is a no-op. The
# `&&` matters: if a migration fails the container exits instead of serving against a
# schema the code does not match — with `restart: always` that surfaces as a visible
# crash loop rather than silent 500s.
CMD ["sh", "-c", "npx prisma migrate deploy --schema=server/prisma/schema.prisma && npm run server"]
