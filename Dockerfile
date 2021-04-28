FROM node:12 as build

WORKDIR /app

COPY ./package.json ./
COPY ./yarn.lock ./

RUN yarn install --production

COPY ./src ./src
COPY ./bin ./bin

FROM node:12-alpine

WORKDIR /app
ENV NODE_ENV production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/yarn.lock ./
COPY --from=build /app/src ./src
COPY --from=build /app/bin ./bin

CMD ["node", "./bin/www"]
