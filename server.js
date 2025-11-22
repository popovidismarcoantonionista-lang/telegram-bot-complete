require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { initBot } = require('./bot');

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Inicializar bot
const bot = initBot();

// Rota de saúde
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Bot Telegram está rodando!',
    timestamp: new Date().toISOString()
  });
});

// Rota de health check para Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Webhook do Telegram
app.post('/webhook', (req, res) => {
  bot.handleUpdate(req.body, res);
});

// Webhook do PaguePix
const paguePixRoutes = require('./routes/paguepix');
app.use('/paguepix', paguePixRoutes);

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro no servidor:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', async () => {
  console.log(\`✅ Servidor rodando na porta \${PORT}\`);
  console.log(\`🌐 URL: http://localhost:\${PORT}\`);

  // Configurar webhook do Telegram
  if (process.env.NODE_ENV === 'production' && process.env.WEBHOOK_URL) {
    try {
      const webhookUrl = process.env.WEBHOOK_URL;
      await bot.telegram.setWebhook(webhookUrl);
      console.log(\`✅ Webhook do Telegram configurado: \${webhookUrl}\`);
    } catch (error) {
      console.error('❌ Erro ao configurar webhook:', error);
    }
  } else {
    // Modo desenvolvimento - polling
    console.log('🔄 Modo desenvolvimento - usando polling');
    bot.launch();

    // Graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  }
});

module.exports = app;
