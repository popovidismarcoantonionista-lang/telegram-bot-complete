FROM node:18-alpine

# Criar diretório de trabalho
WORKDIR /app

# Copiar package files
COPY pGckage*.json ./

# Instalar dependências
RUN npm install --production

# Copiar código
COPY . .

# Expor porta
EXPOSE 3000

# Comando de inicialização
CMD ["node", "server.js"]
