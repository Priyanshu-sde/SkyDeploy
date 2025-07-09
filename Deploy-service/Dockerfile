
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig*.json ./
COPY src ./src
RUN NODE_OPTIONS="--max-old-space-size=1024" npx tsc

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY --from=build /app/dist ./dist
EXPOSE 3003
CMD ["node", "dist/index.js"] 