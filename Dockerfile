# Build common stage
FROM node:10-alpine

WORKDIR /app

COPY ./package.json ./
COPY ./yarn.lock ./

RUN yarn install --production

COPY ./src ./
COPY ./bin ./

CMD ["yarn", "start"]
