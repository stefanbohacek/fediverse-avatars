FROM nginx:alpine
RUN echo 'text/javascript mjs;' >> /etc/nginx/mime.types
COPY . /usr/share/nginx/html