
FROM node:lts-jod

ENV TRAVIS 1

RUN apt-get update -y && \
  apt-get upgrade -y && \
  apt-get install -y --no-install-recommends freeradius-utils

RUN mkdir /app
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY ./ ./

CMD ["npm", "test"]
