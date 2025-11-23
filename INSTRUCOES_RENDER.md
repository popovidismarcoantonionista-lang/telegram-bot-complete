# 📋 Instruções Deploy Render

## ✅ CHECKLIST PRÉ-DEPLOY

Seu repositório GitHub deve ter APENAS:

```
✅ bot.py
✅ requirements.txt
✅ runtime.txt
✅ .env.example
✅ .gitignore
✅ README.md
```

## ❌ DELETE SE EXISTIR:

```
❌ server.js
❌ package.json
❌ package-lock.json
❌ Dockerfile
❌ docker-compose.yml
❌ Qualquer arquivo .js
```

## 🚀 Passo a Passo

### 1. Limpar Repositório

```bash
# Delete arquivos Node.js
git rm server.js package.json package-lock.json

# Delete Dockerfiles
git rm Dockerfile docker-compose.yml

# Commit
git commit -m "Limpar: apenas Python"
git push
```

### 2. Render - New Web Service

1. Dashboard → **New +**
2. **Web Service**
3. Connect GitHub
4. Selecione repositório

### 3. Configurar

**Runtime:**
```
Python 3
```

**Build Command:**
```
pip install -r requirements.txt
```

**Start Command:**
```
python bot.py
```

**Instance Type:**
```
Free
```

### 4. Environment Variables

Clique "Add Environment Variable" (UMA POR UMA):

```
Key: TELEGRAM_BOT_TOKEN
Value: 8568457945:AAF5qoQtOG7yYLtik73imtym3RiOOT7ae-M

Key: OPENROUTER_API_KEY
Value: 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

Key: PIAPI_KEY
Value: c4e0248b88761fd4eef42ff82ca4b70cc51aec3ff648b44ea4b9dc2e49996eb0

Key: PIXINTEGRA_API_TOKEN
Value: apitoken_f6815555698bded8004cbdce0598651999af6f40c9eba8

Key: PIXINTEGRA_API_KEY
Value: apikey_bf4b4688300dd58afed9e11ffe28b40157d7c8bb1f9cda
```

### 5. Create Web Service

Aguarde 2-3 minutos.

## ✅ Logs Corretos

```
==> Building...
Installing Python dependencies
Successfully installed python-telegram-bot flask requests
==> Deploying...
🚀 Iniciando bot...
🌐 Flask porta 10000
🤖 Bot ONLINE!
🔄 Verificação automática ATIVA!
==> Your service is live 🎉
```

## 🧪 Testar

### Health Check:
```
https://seu-bot.onrender.com/health
```

Deve retornar:
```json
{"status": "healthy", "checks": "passing"}
```

### Bot Telegram:
```
/start
```

## 🆘 Se Der Erro

### "Running node server.js"
→ Você tem arquivo Node.js no repo. DELETE todos .js

### "ModuleNotFoundError"
→ Verifique requirements.txt

### "Port already in use"
→ Normal no Render, ignore

## 🎯 Manter Bot Acordado

Render dorme após 15 min. Use:
- https://cron-job.org
- Ping a cada 10 min em: `https://seu-bot.onrender.com/health`

---

**Pronto! Bot 100% Python no Render! 🚀**
