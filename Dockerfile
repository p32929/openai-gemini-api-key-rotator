FROM node:20-slim

WORKDIR /

COPY . .

WORKDIR /app

RUN cd /app && npm install

ENTRYPOINT [ "npm", "start" ]
