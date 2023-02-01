FROM node:18

WORKDIR /usr/src/app

COPY package.json ./

RUN npm install

COPY dist ./

ENV PORT=4000

EXPOSE 4000

CMD ["npm", "start"]