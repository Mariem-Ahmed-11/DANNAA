FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

FROM nginx:alpine

# Requests under /api and /sanctum are proxied to the backend so the browser
# always talks to a single origin and session cookies are accepted.
ENV BACKEND_ORIGIN=https://backend-production-e2af4133.up.railway.app

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80
