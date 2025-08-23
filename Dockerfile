FROM node:18
ENV NODE_OPTIONS="--max_old_space_size=4096"

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json files
COPY package*.json ./


COPY prisma ./prisma

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Generate Database
ENV NEXT_PUBLIC_SKIP_DB_CONNECT=true


RUN npx prisma generate

# Build the Next.js application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the Next.js application
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]