FROM node:18-alpine

# Criar diretório de trabalho
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código
COPY . .

# Expor porta
EXPOSE 3000

# Comando de inicialização
CMD ["node", "server.js"]
