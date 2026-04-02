# Build stage
FROM node:20-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build the app
COPY . .
RUN pnpm run codegen
RUN pnpm run build

# Production stage — serve with nginx
FROM nginx:alpine AS production

# Copy built assets
COPY --from=builder /app/dist/cloudtalk_homework_fe/browser /usr/share/nginx/html

# nginx config for Angular (HTML5 pushState routing)
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
