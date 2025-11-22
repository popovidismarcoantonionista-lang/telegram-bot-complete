# 🧪 COMANDOS DE TESTE

## Testar localmente

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar .env
```bash
cp .env.example .env
# Edite .env com suas credenciais
nano .env
```

### 3. Iniciar servidor
```bash
npm start
```

O bot funcionará em modo polling (sem webhook) localmente.

---

## Testar APIs individualmente

### Testar SMS-Activate
```bash
node -e "
const sms = require('./services/sms');
sms.getServices('br').then(console.log);
"
```

### Testar Apex
```bash
node -e "
const apex = require('./services/apex');
apex.getServices().then(console.log);
"
```

### Testar PaguePix
```bash
node -e "
const pix = require('./services/paguepix');
pix.createPixCharge(10, 123456789, 'Teste').then(console.log);
"
```

### Testar Supabase
```bash
node -e "
const db = require('./database/supabase');
db.getOrCreateUser(123456789, 'teste').then(console.log);
"
```

---

## Testar via cURL

### Health check
```bash
curl https://seu-app.onrender.com/health
```

### Webhook teste
```bash
curl -X POST https://seu-app.onrender.com/paguepix/webhook   -H "Content-Type: application/json"   -d '{
    "event": "charge.paid",
    "data": {
      "id": "test123",
      "transaction_id": "txid123",
      "value": "10.00",
      "status": "paid",
      "customer": {
        "tax_id": "123456789"
      }
    }
  }'
```

---

## Comandos do Bot

| Comando | Descrição |
|---------|-----------|
| `/start` | Iniciar bot e registrar usuário |
| `/saldo` | Ver saldo atual |
| `/sms` | Listar serviços SMS |
| `/comprar_sms CODIGO` | Comprar número SMS |
| `/seguidores` | Menu de seguidores |
| `/comprar_apex ID LINK QTD` | Comprar seguidores |
| `/depositar` | Depositar via Pix |
| `/suporte` | Contato de suporte |
| `/menu` | Voltar ao menu principal |

---

## Fluxo de Teste Completo

### 1. Testar registro de usuário
```
Você: /start
Bot: Bem-vindo! [exibe menu]
```

### 2. Testar consulta de saldo
```
Você: /saldo
Bot: Seu saldo: R$ 0,00
```

### 3. Testar listagem SMS
```
Você: /sms
Bot: [lista de serviços SMS com preços]
```

### 4. Testar auto-compra (sem saldo)
```
Você: /comprar_sms wa
Bot: ⚠️ Saldo insuficiente!
     Gerando cobrança automática...
     [QR Code + Copia e Cola]
```

### 5. Testar depósito manual
```
Você: /depositar
Bot: Envie o valor
Você: 20
Bot: [QR Code + Copia e Cola]
```

### 6. Simular pagamento
- Pague um Pix de teste (mínimo R$ 5,00)
- Aguarde confirmação (webhook)
- Bot deve enviar: "✅ Pagamento confirmado!"

### 7. Testar compra com saldo
```
Você: /comprar_sms wa
Bot: Comprando número SMS...
     📱 Número: +55...
     ⏳ Aguardando SMS...
     ✅ Código recebido: 123456
```

### 8. Testar Apex
```
Você: /seguidores
Bot: [menu de categorias]
Você: [clica em Instagram]
Bot: [lista de serviços]
Você: /comprar_apex 123 https://instagram.com/perfil 1000
Bot: ✅ Pedido criado! ID: 456789
```

---

## Checklist de Funcionalidades

- [ ] Bot responde ao /start
- [ ] Menu exibe corretamente
- [ ] /saldo funciona
- [ ] /sms lista serviços
- [ ] /seguidores exibe categorias
- [ ] Depósito manual gera Pix
- [ ] Auto-compra detecta saldo insuficiente
- [ ] Auto-compra gera Pix automático
- [ ] Webhook recebe confirmação
- [ ] Saldo é atualizado após pagamento
- [ ] Pedido é reexecutado automaticamente
- [ ] SMS é recebido e enviado
- [ ] Pedido Apex é criado com sucesso
- [ ] Tabelas Supabase são populadas

---

## Logs Importantes

### Logs de sucesso esperados:
```
✅ Servidor rodando na porta 3000
✅ Webhook do Telegram configurado
📥 Webhook PaguePix recebido
✅ Pagamento confirmado: txid123
💰 Saldo adicionado para usuário 123456789
🔄 Auto-retry detectado, processando...
📱 Número SMS adquirido!
```

### Logs de erro para investigar:
```
❌ Erro ao criar cobrança Pix
❌ Erro ao buscar serviços SMS
❌ Erro ao criar pedido Apex
❌ Assinatura inválida (webhook)
```
