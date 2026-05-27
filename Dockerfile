FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
COPY src ./src
COPY public ./public
COPY docs ./docs
COPY data ./data

ENV NODE_ENV=production
ENV PORT=8080
ENV NODE_OPTIONS=--experimental-sqlite

EXPOSE 8080
CMD ["npm", "start"]
