
FROM harbor.sangoai.com/library/node:20 AS build
WORKDIR /app
RUN npm config set registry https://registry.npm.taobao.org
COPY . .
FROM  harbor.sangoai.com/library/nginx:stable
EXPOSE 80
COPY --from=build /app/dist /usr/share/nginx/html/
ENTRYPOINT ["nginx", "-g", "daemon off;"]

