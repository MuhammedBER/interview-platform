# ---- Build stage: compile the Vite/React app ----
FROM node:20-alpine AS build
WORKDIR /app

# Gateway URL is injected via Docker build args (from docker-compose build.args)
# and baked into the bundle at build time by Vite (import.meta.env.VITE_GATEWAY_URL).
ARG VITE_GATEWAY_URL=http://localhost:8080
ARG VITE_KEYCLOAK_URL=http://localhost:8180
ENV VITE_GATEWAY_URL=$VITE_GATEWAY_URL
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime stage: nginx serves the static SPA ----
FROM nginx:1.27-alpine AS runtime
# bash is used by the compose healthcheck (same /dev/tcp pattern as the backend services)
RUN apk add --no-cache bash
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
