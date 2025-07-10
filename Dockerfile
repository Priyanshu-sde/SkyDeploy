FROM node:20-bullseye

RUN apt-get update && \
    apt-get install -y redis-server supervisor && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g ts-node typescript

WORKDIR /app


COPY Deploy-service /app/Deploy-service
COPY request-handler /app/request-handler
COPY Upload_Service /app/Upload_Service

WORKDIR /app/Deploy-service
RUN npm install

WORKDIR /app/request-handler
RUN npm install

WORKDIR /app/Upload_Service
RUN npm install

COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 3000 3001 3002 6379

# Start supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]