# Frontend: build the Vite app, then serve the static bundle with nginx.
FROM node:18-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --prefer-offline

COPY . .

# Relative API base so the browser calls /api on the same origin (proxied by nginx).
# A real env var takes precedence over .env.production at build time.
ENV VITE_API_BASE_URL=/api
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
