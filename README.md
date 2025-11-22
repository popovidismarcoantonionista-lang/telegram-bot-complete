# 🤖 Bot Telegram Completo - SMS & Seguidores

Bot Telegram completo com integração de:
- 📱 SMS-Activate (compra de números para receber SMS)
- 👥 Apex Seguidores (seguidores, likes, views)
- 💳 PaguePix (pagamentos via Pix)
- 🔄 **Auto-compra de créditos** (compra automática quando saldo insuficiente)
- 💾 Supabase (banco de dados)

## 🚀 Funcionalidades

### ✅ Fluxo de Auto-Compra de Créditos

Quando o usuário tenta comprar SMS ou Seguidores sem saldo suficiente:

1. Bot detecta saldo insuficiente
2. Calcula quanto falta
3. Gera cobrança Pix automaticamente com o valor exato
4. Envia QR Code + Copia e Cola
5. Webhook da PaguePix confirma pagamento
6. Saldo é atualizado automaticamente
7. **Bot reprocessa o pedido original automaticamente**
8. Usuário recebe confirmação e resultado

### 📱 Comandos Disponíveis

- \`/start\` - Iniciar bot e ver menu
- \`/saldo\` - Ver saldo atual
- \`/sms\` - Listar serviços SMS disponíveis
- \`/comprar_sms CODIGO\` - Comprar número SMS
- \`/seguidores\` - Menu de seguidores
- \`/comprar_apex ID LINK QUANTIDADE\` - Comprar seguidores/likes
- \`/depositar\` - Depositar via Pix
- \`/suporte\` - Contato de suporte

## 📦 Estrutura do Projeto

\`\`\`
telegram-bot-complete/
├── server.js                 # Servidor Express + Webhooks
├── bot.js                    # Lógica principal do bot
├── services/
│   ├── paguepix.js          # Integração PaguePix
│   ├── sms.js               # Integração SMS-Activate
│   └── apex.js              # Integração Apex Seguidores
├── database/
│   └── supabase.js          # Funções do banco de dados
├── utils/
│   └── keyboards.js         # Teclados do Telegram
├── routes/
│   └── paguepix.js          # Webhook PaguePix
├── package.json
├── Dockerfile
├── Procfile
├── .env.example
└── README.md
\`\`\`

## 🛠️ Configuração do Supabase

### 1. Criar Projeto no Supabase

1. Acesse https://supabase.com
2. Crie um novo projeto
3. Anote a URL e a Service Role Key

### 2. Criar Tabelas

Execute os seguintes SQLs no editor SQL do Supabase:

\`\`\`sql
-- Tabela de usuários
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),
  saldo DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de depósitos
CREATE TABLE deposits (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  txid VARCHAR(255) UNIQUE NOT NULL,
  pix_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- Tabela de pedidos
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  parametros JSONB,
  resultado JSONB,
  valor DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- Tabela de auto-retries
CREATE TABLE auto_retries (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  pedido_original JSONB NOT NULL,
  falta DECIMAL(10, 2) NOT NULL,
  pix_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'waiting_payment',
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id)
);

-- Índices para performance
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_deposits_telegram_id ON deposits(telegram_id);
CREATE INDEX idx_deposits_txid ON deposits(txid);
CREATE INDEX idx_orders_telegram_id ON orders(telegram_id);
CREATE INDEX idx_auto_retries_pix_id ON auto_retries(pix_id);
\`\`\`

## 🔧 Configuração das APIs

### 1. Telegram Bot

1. Fale com [@BotFather](https://t.me/botfather)
2. Crie um novo bot: \`/newbot\`
3. Copie o token gerado

### 2. SMS-Activate

1. Acesse https://sms-activate.org
2. Faça cadastro e login
3. Vá em "API" no menu
4. Copie sua API Key

### 3. Apex Seguidores

1. Acesse https://apexseguidores.com.br
2. Faça cadastro
3. Vá em "API"
4. Copie sua API Key

### 4. PaguePix

1. Acesse https://paguepix.com/dashboard
2. Faça cadastro e login
3. Configure sua chave Pix
4. Vá em "Configurações" → "API"
5. Copie:
   - API Key
   - Secret Key
   - Chave Pix

## 🚀 Deploy no Render

### 1. Preparar Repositório

\`\`\`bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/seu-usuario/seu-repo.git
git push -u origin main
\`\`\`

### 2. Criar Web Service no Render

1. Acesse https://render.com
2. Clique em "New +" → "Web Service"
3. Conecte seu repositório GitHub
4. Configure:
   - **Name:** seu-bot-telegram
   - **Environment:** Node
   - **Build Command:** \`npm install\`
   - **Start Command:** \`node server.js\`
   - **Plan:** Free

### 3. Configurar Variáveis de Ambiente

No painel do Render, adicione as seguintes variáveis:

\`\`\`
BOT_TOKEN=seu_token_aqui
WEBHOOK_URL=https://seu-app.onrender.com/webhook

SMS_ACTIVATE_API_KEY=sua_chave
APEX_API_KEY=sua_chave

PAGUEPIX_API_KEY=sua_chave
PAGUEPIX_SECRET_KEY=sua_chave_secreta
PAGUEPIX_PIX_KEY=sua_chave_pix

SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE=sua_service_role

PORT=3000
NODE_ENV=production
\`\`\`

### 4. Deploy

1. Clique em "Create Web Service"
2. Aguarde o deploy completar
3. Copie a URL gerada (ex: \`https://seu-app.onrender.com\`)
4. Atualize a variável \`WEBHOOK_URL\` com a URL correta

### 5. Configurar Webhook da PaguePix

1. Acesse o painel da PaguePix
2. Vá em "Webhooks"
3. Configure:
   - **URL:** \`https://seu-app.onrender.com/paguepix/webhook\`
   - **Eventos:** Marque "charge.paid" e "charge.confirmed"
4. Salve

## 🧪 Testar Localmente

\`\`\`bash
# Instalar dependências
npm install

# Copiar .env
cp .env.example .env

# Editar .env com suas credenciais
nano .env

# Iniciar servidor
npm start
\`\`\`

O bot funcionará em modo polling (sem webhook) localmente.

## 📊 Fluxo de Auto-Compra

\`\`\`
┌─────────────────────────────────────────────────────────┐
│ 1. Usuário: /comprar_sms wa                            │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Bot verifica saldo                                   │
│    Saldo atual: R$ 2,00                                 │
│    Preço: R$ 5,00                                       │
│    Falta: R$ 3,00                                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Bot gera cobrança Pix de R$ 3,00 automaticamente    │
│    - Salva em 'deposits'                                │
│    - Salva em 'auto_retries' com pedido original        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Bot envia QR Code + Copia e Cola                    │
│    "Pague para liberar automaticamente seu pedido"     │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Usuário paga via Pix                                 │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Webhook PaguePix recebe confirmação                  │
│    POST /paguepix/webhook                               │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 7. Bot processa webhook:                                │
│    - Atualiza saldo (R$ 2,00 → R$ 5,00)                │
│    - Busca auto_retry pelo pix_id                       │
│    - Detecta pedido original (SMS wa)                   │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 8. Bot reexecuta automaticamente:                       │
│    - Compra número SMS                                  │
│    - Desconta saldo                                     │
│    - Aguarda código                                     │
│    - Envia código ao usuário                            │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 9. Usuário recebe:                                      │
│    ✅ "Pagamento confirmado!"                           │
│    📱 "Número SMS: +5511999..."                         │
│    📨 "Código: 123456"                                  │
└─────────────────────────────────────────────────────────┘
\`\`\`

## 🔒 Segurança

- ✅ Validação de assinatura do webhook PaguePix
- ✅ Variáveis de ambiente para credenciais
- ✅ Service Role do Supabase (sem exposição no frontend)
- ✅ HTTPS obrigatório em produção

## 📝 Logs e Auditoria

Todos os pedidos são salvos em:
- \`deposits\` - Histórico de depósitos
- \`orders\` - Histórico de pedidos
- \`auto_retries\` - Auditoria de compras automáticas

## 🐛 Troubleshooting

### Bot não responde
- Verifique se o webhook está configurado corretamente
- Confira os logs no Render
- Teste localmente com \`npm start\`

### Pagamentos não confirmam
- Verifique webhook da PaguePix
- Confira URL: \`https://seu-app.onrender.com/paguepix/webhook\`
- Veja logs do webhook no painel da PaguePix

### SMS não chega
- Verifique saldo da SMS-Activate
- Alguns serviços podem demorar até 2 minutos
- Use código de serviço correto

## 📞 Suporte

Para dúvidas ou problemas:
- 📧 Email: suporte@seubot.com
- 💬 Telegram: @seusuporte

## 📄 Licença

MIT License - Livre para uso e modificação.

---

**Desenvolvido com ❤️ para automação de serviços**
