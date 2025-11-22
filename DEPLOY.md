# 🚀 INSTRUÇÕES DE DEPLOY - PASSO A PASSO

## 📋 CHECKLIST PRÉ-DEPLOY

- [ ] Conta no Render (https://render.com)
- [ ] Conta no Supabase (https://supabase.com)
- [ ] Bot criado no @BotFather
- [ ] Conta SMS-Activate com API Key
- [ ] Conta Apex Seguidores com API Key
- [ ] Conta PaguePix com API configurada

---

## 1️⃣ CONFIGURAR SUPABASE

### Passo 1.1: Criar Projeto
1. Acesse https://supabase.com
2. Clique em "New Project"
3. Preencha:
   - **Name:** telegram-bot
   - **Database Password:** (escolha uma senha forte)
   - **Region:** South America (São Paulo)
4. Clique em "Create new project"
5. Aguarde 2-3 minutos

### Passo 1.2: Criar Tabelas
1. No menu lateral, clique em "SQL Editor"
2. Clique em "New Query"
3. Cole todo o conteúdo do arquivo `supabase_schema.sql`
4. Clique em "Run" (ou pressione Ctrl+Enter)
5. Verifique se as 4 tabelas foram criadas sem erros

### Passo 1.3: Copiar Credenciais
1. Vá em "Settings" → "API"
2. Copie:
   - **Project URL** (ex: https://abcdefgh.supabase.co)
   - **service_role key** (em "Project API keys", role "service_role")
3. Guarde essas informações

---

## 2️⃣ CONFIGURAR APIS

### Passo 2.1: Telegram Bot
1. Abra o Telegram
2. Busque por @BotFather
3. Digite `/newbot`
4. Siga as instruções:
   - Nome do bot: `Seu Bot de Serviços`
   - Username: `seu_bot_servicos_bot` (deve terminar com _bot)
5. Copie o **token** fornecido (ex: 123456789:ABCdef...)
6. Guarde o token

### Passo 2.2: SMS-Activate
1. Acesse https://sms-activate.org
2. Faça login ou cadastre-se
3. Vá em "Profile" → "API"
4. Copie sua **API Key**
5. Guarde a key

### Passo 2.3: Apex Seguidores
1. Acesse https://apexseguidores.com.br
2. Faça login ou cadastre-se
3. Vá em "API" no menu
4. Copie sua **API Key**
5. Guarde a key

### Passo 2.4: PaguePix
1. Acesse https://paguepix.com/dashboard
2. Faça login ou cadastre-se
3. Configure sua chave Pix em "Chaves Pix"
4. Vá em "Configurações" → "API"
5. Copie:
   - **API Key**
   - **Secret Key**
   - **Chave Pix** (a que você configurou)
6. Guarde essas informações

---

## 3️⃣ PREPARAR CÓDIGO

### Passo 3.1: Criar Repositório no GitHub
1. Acesse https://github.com
2. Clique em "New repository"
3. Preencha:
   - **Repository name:** telegram-bot-complete
   - **Visibility:** Private (recomendado)
4. Clique em "Create repository"

### Passo 3.2: Fazer Upload do Código
```bash
# No diretório do projeto baixado
cd telegram-bot-complete

# Inicializar git
git init

# Adicionar arquivos
git add .

# Fazer commit
git commit -m "Initial commit - Bot Telegram completo"

# Adicionar remote (substitua SEU_USUARIO pelo seu usuário GitHub)
git remote add origin https://github.com/SEU_USUARIO/telegram-bot-complete.git

# Fazer push
git branch -M main
git push -u origin main
```

---

## 4️⃣ DEPLOY NO RENDER

### Passo 4.1: Criar Web Service
1. Acesse https://render.com
2. Faça login ou cadastre-se
3. No dashboard, clique em "New +"
4. Selecione "Web Service"
5. Conecte sua conta GitHub
6. Selecione o repositório `telegram-bot-complete`
7. Clique em "Connect"

### Passo 4.2: Configurar Service
Preencha os campos:

- **Name:** `telegram-bot` (ou nome de sua preferência)
- **Region:** Oregon (US West) - ou mais próximo
- **Branch:** `main`
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `node server.js`
- **Plan:** `Free`

### Passo 4.3: Adicionar Variáveis de Ambiente

Role até "Environment Variables" e adicione uma por uma:

**IMPORTANTE:** Substitua os valores pelos que você copiou nas etapas anteriores!

```
BOT_TOKEN=123456789:ABCdef_seu_token_aqui
WEBHOOK_URL=https://seu-app.onrender.com/webhook

SMS_ACTIVATE_API_KEY=sua_chave_sms_activate
APEX_API_KEY=sua_chave_apex

PAGUEPIX_API_KEY=sua_chave_paguepix
PAGUEPIX_SECRET_KEY=sua_chave_secreta_paguepix
PAGUEPIX_PIX_KEY=sua_chave_pix

SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_SERVICE_ROLE=sua_service_role_key_aqui

PORT=3000
NODE_ENV=production
```

**ATENÇÃO:** A variável `WEBHOOK_URL` você só saberá depois que o deploy terminar! Deixe com um valor placeholder por enquanto.

### Passo 4.4: Criar Web Service
1. Revise todas as configurações
2. Clique em "Create Web Service"
3. Aguarde 3-5 minutos para o deploy completar
4. Você verá logs aparecendo na tela

---

## 5️⃣ CONFIGURAR WEBHOOK

### Passo 5.1: Copiar URL do Render
1. Quando o deploy completar, você verá "Your service is live 🎉"
2. No topo da página, copie a URL (ex: `https://telegram-bot-abcd.onrender.com`)

### Passo 5.2: Atualizar Variável WEBHOOK_URL
1. No Render, vá em "Environment"
2. Encontre a variável `WEBHOOK_URL`
3. Clique em "Edit"
4. Substitua o valor por: `https://SUA-URL.onrender.com/webhook`
5. Clique em "Save Changes"
6. O serviço irá reiniciar automaticamente

### Passo 5.3: Configurar Webhook do Telegram (Opcional)
O bot já configura automaticamente, mas se precisar fazer manualmente:

1. Abra o navegador
2. Acesse:
```
https://api.telegram.org/bot{SEU_BOT_TOKEN}/setWebhook?url={SUA_URL}/webhook
```

Substitua:
- `{SEU_BOT_TOKEN}` pelo token do BotFather
- `{SUA_URL}` pela URL do Render

3. Você deve ver: `{"ok":true,"result":true}`

### Passo 5.4: Configurar Webhook do PaguePix
1. Acesse https://paguepix.com/dashboard
2. Vá em "Webhooks" ou "Configurações de API"
3. Adicione um novo webhook:
   - **URL:** `https://SUA-URL.onrender.com/paguepix/webhook`
   - **Eventos:** Marque "charge.paid" e "charge.confirmed"
4. Salve

---

## 6️⃣ TESTAR BOT

### Passo 6.1: Testar Comandos Básicos
1. Abra o Telegram
2. Busque pelo username do seu bot (ex: @seu_bot_servicos_bot)
3. Envie `/start`
4. Você deve ver o menu principal
5. Teste `/saldo` - deve mostrar R$ 0,00

### Passo 6.2: Testar Listagem de Serviços
1. Clique em "📱 Comprar SMS" ou envie `/sms`
2. Deve aparecer a lista de serviços SMS
3. Clique em "👥 Comprar Seguidores" ou envie `/seguidores`
4. Deve aparecer o menu de categorias

### Passo 6.3: Testar Depósito Via Pix
1. Envie `/depositar` ou clique em "💰 Depositar via Pix"
2. Digite um valor (ex: `10`)
3. Você deve receber:
   - QR Code do Pix
   - Código Copia e Cola
4. Não precisa pagar agora, é só para testar

### Passo 6.4: Testar Auto-Compra de Créditos
1. Com saldo R$ 0,00, tente comprar um SMS:
   ```
   /comprar_sms wa
   ```
2. O bot deve:
   - Detectar saldo insuficiente
   - Gerar cobrança Pix automaticamente
   - Enviar QR Code
   - Mostrar mensagem sobre auto-compra

---

## 7️⃣ MONITORAMENTO

### Logs no Render
1. No painel do Render, clique em "Logs"
2. Você verá todos os logs em tempo real
3. Procure por erros ou avisos

### Logs no Supabase
1. Vá em "Table Editor"
2. Verifique as tabelas:
   - `users` - usuários registrados
   - `deposits` - depósitos criados
   - `orders` - pedidos realizados
   - `auto_retries` - auto-compras

---

## 🔧 TROUBLESHOOTING

### Bot não responde
**Problema:** Bot não responde aos comandos

**Soluções:**
1. Verifique logs no Render
2. Confirme que `WEBHOOK_URL` está correto
3. Teste o webhook:
   ```
   curl https://SUA-URL.onrender.com/health
   ```
   Deve retornar: `{"status":"healthy"}`

### Erro ao criar depósito
**Problema:** Erro ao gerar cobrança Pix

**Soluções:**
1. Verifique credenciais da PaguePix
2. Confirme que a chave Pix está configurada na PaguePix
3. Veja logs no Render para detalhes do erro

### SMS não chega
**Problema:** Código SMS não é recebido

**Soluções:**
1. Verifique saldo na SMS-Activate
2. Alguns serviços demoram até 2 minutos
3. Teste com outro serviço (ex: `wa`, `tg`)

### Pagamento não confirma
**Problema:** Pagou o Pix mas saldo não atualiza

**Soluções:**
1. Verifique webhook da PaguePix está configurado
2. Veja logs do webhook no painel da PaguePix
3. Confirme URL: `https://SUA-URL.onrender.com/paguepix/webhook`
4. Verifique logs no Render

---

## ✅ DEPLOY COMPLETO!

Seu bot está rodando! 🎉

### Próximos Passos:
1. Teste todas as funcionalidades
2. Faça um depósito real pequeno (R$ 5) para testar
3. Convide usuários para testar
4. Monitore logs e tabelas do Supabase
5. Configure alertas no Render (opcional)

### Suporte:
- Documentação completa no `README.md`
- Logs do Render para debugging
- Painel do Supabase para dados

---

**Desenvolvido com ❤️**
