FROM node:12-alpine

RUN apk update && \
    apk add git


WORKDIR /

COPY package*.json ./

RUN npm install
COPY . .

EXPOSE 8001

CMD [ "node", "index.js" ]