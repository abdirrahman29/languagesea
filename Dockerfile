# Use a smaller base image for a more lightweight final image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker's layer caching
COPY package*.json ./

# Install dependencies
# The --legacy-peer-deps flag is often a workaround; consider fixing peer dependency issues if possible
RUN npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Generate Prisma Client
# This must be done before the build step to include the client in the final build artifact
RUN npx prisma generate

# Build the Next.js application
RUN npm run build

# --- Start a new stage for a leaner production image ---
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy only the necessary files from the previous build stage
# This significantly reduces the final image size
COPY --from=0 /app/node_modules ./node_modules
COPY --from=0 /app/package.json ./package.json
COPY --from=0 /app/prisma ./prisma
COPY --from=0 /app/.next ./.next
COPY --from=0 /app/public ./public

# Set environment variables for Next.js to run in production mode
ENV NODE_ENV=production

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]