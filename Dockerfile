FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm install
RUN cd server && npm install

# Copy source code
COPY . .

# Build frontend and backend
RUN npm run build
RUN cd server && npm run build

# Expose ports
EXPOSE 3000 8080

# Start both frontend and backend
CMD ["sh", "-c", "cd server && npm start & npm start"]
