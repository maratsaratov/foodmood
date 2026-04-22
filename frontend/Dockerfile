# --- Build stage ---
FROM node:18-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps && \
    npm install --legacy-peer-deps ajv@^8.11.0 ajv-keywords@^5.1.0
COPY . .
RUN npm run build

# --- Serve stage ---
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]