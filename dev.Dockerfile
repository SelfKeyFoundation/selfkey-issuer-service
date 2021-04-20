# Build common stage
FROM node:12-alpine as common

RUN apk add --no-cache git

WORKDIR /app

COPY ./package.json ./
COPY ./yarn.lock ./

RUN yarn

COPY ./src ./
COPY ./bin ./

VOLUME /app/node_modules

CMD ["yarn", "start-dev"]
