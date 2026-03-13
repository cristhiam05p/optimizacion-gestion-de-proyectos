FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate && npm run build
EXPOSE 4000
CMD sh -c 'until nc -z postgres 5432; do echo waiting for db; sleep 1; done; npx prisma migrate deploy; npm run start'
