# ATG Apply — Frontend (Vite + React)
#
# VITE_* variables are baked into the static bundle at build time (Vite/browser
# convention — they end up in the shipped JS regardless, so they are not
# treated as server secrets). Provide them via the atg_frontend/.env file
# (see .env.example) before building this image.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
