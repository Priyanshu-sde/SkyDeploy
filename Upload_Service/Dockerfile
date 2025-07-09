
FROM node:18-alpine as build
WORKDIR /app
RUN apk add --no-cache git
COPY package*.json ./
RUN npm install
COPY tsconfig*.json ./
COPY src ./src
RUN NODE_OPTIONS="--max-old-space-size=1024" npx tsc

# Production stage
FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache git
COPY package*.json ./
RUN npm install --production
COPY --from=build /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"] 