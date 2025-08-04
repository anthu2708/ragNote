FROM nginx:alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY frontend/build /usr/share/nginx/html
