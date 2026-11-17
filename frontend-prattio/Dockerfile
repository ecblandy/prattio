FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
ENV API_UPSTREAM=backendprattio-backend-6syebd NGINX_ENVSUBST_FILTER=^API_UPSTREAM$
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/frontend-prattio/browser /usr/share/nginx/html
EXPOSE 80
