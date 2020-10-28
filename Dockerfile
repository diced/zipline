FROM node:14

WORKDIR /opt/zipline

COPY . /opt/zipline

RUN npm i
RUN npm run build

ENV NODE_ENV=production
EXPOSE 8000
CMD ["node", "dist"]