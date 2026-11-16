FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY client ./client
RUN npm run build
FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && mkdir /app/data && chown node:node /app/data
COPY server ./server
COPY --from=build /app/client/dist ./client/dist
USER node
ENV NODE_ENV=production PORT=6001 DATA_DIR=/app/data
EXPOSE 6001
CMD ["node","server/index.js"]
