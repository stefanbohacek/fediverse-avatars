FROM nginx:alpine
RUN sed -i '/text\/javascript/s/js;/js mjs;/' /etc/nginx/mime.types
COPY . /usr/share/nginx/html