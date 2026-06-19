FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --include=optional
COPY src ./src
COPY public ./public
RUN mkdir -p data
COPY data/seed.json ./data/seed.json

ENV NODE_ENV=production
ENV PORT=8080
ENV NODE_OPTIONS=--experimental-sqlite

EXPOSE 8080
CMD ["npm", "start"]
