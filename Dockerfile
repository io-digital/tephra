
FROM node:lts-buster

ENV TRAVIS 1

RUN apt-get update -y
RUN apt-get upgrade -y
RUN apt-get install -y --no-install-recommends freeradius-utils

RUN mkdir /app
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY ./ ./

CMD ["npm", "test"]
