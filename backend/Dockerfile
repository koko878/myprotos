# Dockerfile pour Hugging Face Spaces (SDK: Docker).
# HF expose le port 7860 par défaut — le serveur lit process.env.PORT.
FROM node:20-slim

WORKDIR /app

# Dépendances (cache de couche)
COPY package.json ./
RUN npm install --omit=dev

# Code
COPY . .

ENV PORT=7860
EXPOSE 7860

CMD ["npm", "start"]
