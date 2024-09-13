FROM node:20

WORKDIR /usr/src/app

COPY package*.json ./
COPY .env ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 8080

CMD ["node", "dist/api.js"]