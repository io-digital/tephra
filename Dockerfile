
FROM node:lts-stretch

ENV TRAVIS 1

RUN apt-get update -y
RUN apt-get upgrade -y
RUN apt-get install -y freeradius-utils

RUN mkdir /app
WORKDIR /app
ADD package-lock.json /app
ADD package.json /app
RUN npm install
ADD . /app

CMD ["npm", "test"]
