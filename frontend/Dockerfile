# Stage 1: Build do Frontend (Vite)
FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Nginx para servir estáticos e rotear API
FROM nginx:alpine

# Copiar os arquivos gerados no Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar nossa configuração otimizada do Nginx
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
