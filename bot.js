const { Telegraf, Markup } = require('telegraf');
const db = require('./database/supabase');
const paguepix = require('./services/paguepix');
const sms = require('./services/sms');
const apex = require('./services/apex');
const keyboards = require('./utils/keyboards');

// Estado temporário para múltiplas etapas
const userStates = {};

/**
 * Inicializar bot
 */
function initBot() {
  const bot = new Telegraf(process.env.BOT_TOKEN);

  // Tornar bot global para uso no webhook
  global.bot = bot;

  /**
   * COMANDO /start
   */
  bot.start(async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const username = ctx.from.username;

      // Registrar ou buscar usuário
      const result = await db.getOrCreateUser(telegramId, username);

      if (result.success) {
        await ctx.reply(
          `👋 *Bem-vindo ao Bot de Serviços!*\n\n` +
          `Escolha uma opção abaixo:`,
          {
            parse_mode: 'Markdown',
            reply_markup: keyboards.mainMenu()
          }
        );
      } else {
        await ctx.reply('❌ Erro ao registrar usuário. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro no comando /start:', error);
      await ctx.reply('❌ Erro interno. Tente novamente.');
    }
  });

  /**
   * COMANDO /saldo - Ver saldo atual
   */
  bot.hears(['💳 Meu Saldo', '/saldo'], async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const result = await db.getUserBalance(telegramId);

      if (result.success) {
        await ctx.reply(
          `💰 *Seu Saldo*\n\n` +
          `R$ ${result.saldo.toFixed(2)}`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.reply('❌ Erro ao consultar saldo.');
      }
    } catch (error) {
      console.error('Erro ao consultar saldo:', error);
      await ctx.reply('❌ Erro interno.');
    }
  });

  /**
   * COMPRAR SMS - Listar serviços
   */
  bot.hears(['📱 Comprar SMS', '/sms'], async (ctx) => {
    try {
      await ctx.reply('🔄 Carregando serviços SMS...');

      const result = await sms.getServices('br');

      if (result.success && result.services.length > 0) {
        let message = '📱 *Serviços SMS Disponíveis*\n\n';

        result.services.forEach((service, index) => {
          if (index < 15) {
            message += `${index + 1}. ${service.name}\n`;
            message += `   💰 R$ ${service.price.toFixed(2)}\n`;
            message += `   📊 Disponível: ${service.count}\n\n`;
          }
        });

        message += '\n📝 Para comprar, envie:\n';
        message += '`/comprar_sms CODIGO`\n\n';
        message += 'Exemplo: `/comprar_sms wa` para WhatsApp';

        // Armazenar serviços no estado
        userStates[ctx.from.id] = {
          smsServices: result.services
        };

        await ctx.reply(message, { parse_mode: 'Markdown' });
      } else {
        await ctx.reply('❌ Nenhum serviço disponível no momento.');
      }
    } catch (error) {
      console.error('Erro ao listar serviços SMS:', error);
      await ctx.reply('❌ Erro ao carregar serviços.');
    }
  });

  /**
   * COMPRAR SMS - Processar compra
   */
  bot.command('comprar_sms', async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const args = ctx.message.text.split(' ');

      if (args.length < 2) {
        return ctx.reply('❌ Use: /comprar_sms CODIGO\nExemplo: /comprar_sms wa');
      }

      const serviceCode = args[1].toLowerCase();

      // Buscar serviço
      const servicesResult = await sms.getServices('br');
      if (!servicesResult.success) {
        return ctx.reply('❌ Erro ao buscar serviços.');
      }

      const service = servicesResult.services.find(s => s.code.toLowerCase() === serviceCode);
      if (!service) {
        return ctx.reply('❌ Serviço não encontrado. Use /sms para ver a lista.');
      }

      const preco = service.price;

      // Verificar saldo
      const balanceResult = await db.getUserBalance(telegramId);
      if (!balanceResult.success) {
        return ctx.reply('❌ Erro ao verificar saldo.');
      }

      const saldoAtual = balanceResult.saldo;

      // ====================================
      // FLUXO DE AUTO-COMPRA DE CRÉDITOS
      // ====================================
      if (saldoAtual < preco) {
        const falta = preco - saldoAtual;

        await ctx.reply(
          `⚠️ *Saldo insuficiente!*\n\n` +
          `💰 Saldo atual: R$ ${saldoAtual.toFixed(2)}\n` +
          `🎯 Necessário: R$ ${preco.toFixed(2)}\n` +
          `📉 Falta: R$ ${falta.toFixed(2)}\n\n` +
          `🔄 Gerando cobrança automática...`,
          { parse_mode: 'Markdown' }
        );

        // Criar cobrança Pix automática
        const pixResult = await paguepix.createPixCharge(
          falta,
          telegramId,
          \`Recarga automática - SMS \${service.name}\`
        );

        if (!pixResult.success) {
          return ctx.reply('❌ Erro ao gerar cobrança Pix.');
        }

        const charge = pixResult.charge;

        // Salvar depósito
        await db.createDeposit(telegramId, falta, charge.txid, charge.id);

        // Criar registro de auto-retry
        await db.createAutoRetry(
          telegramId,
          {
            tipo: 'sms',
            serviceCode: serviceCode,
            serviceName: service.name,
            valor: preco
          },
          falta,
          charge.id
        );

        // Enviar QR Code e instruções
        await ctx.replyWithPhoto(
          { source: Buffer.from(charge.qrcode, 'base64') },
          {
            caption:
              \`💳 *Pague para liberar automaticamente seu pedido*\n\n\` +
              \`💰 Valor: R$ \${falta.toFixed(2)}\n\` +
              \`📱 Serviço: \${service.name}\n\n\` +
              \`📋 *Pix Copia e Cola:*\n\` +
              \`\\`\${charge.copiaCola}\\`\n\n\` +
              \`✅ Após o pagamento, seu pedido será processado automaticamente!\`,
            parse_mode: 'Markdown'
          }
        );

        return; // Fluxo de auto-compra iniciado
      }

      // ====================================
      // SALDO SUFICIENTE - PROCESSAR COMPRA
      // ====================================

      await ctx.reply('🔄 Comprando número SMS...');

      const buyResult = await sms.buyNumber(serviceCode);

      if (!buyResult.success) {
        return ctx.reply(\`❌ Erro ao comprar número: \${buyResult.error}\`);
      }

      // Descontar saldo
      await db.updateUserBalance(telegramId, preco, 'subtract');

      // Criar pedido
      await db.createOrder(
        telegramId,
        'sms',
        {
          serviceCode: serviceCode,
          activationId: buyResult.activationId,
          phoneNumber: buyResult.phoneNumber
        },
        preco
      );

      await ctx.reply(
        \`📱 *Número SMS adquirido!*\n\n\` +
        \`📞 Número: +\${buyResult.phoneNumber}\n\` +
        \`🔑 ID: \${buyResult.activationId}\n\` +
        \`💰 Cobrado: R$ \${preco.toFixed(2)}\n\n\` +
        \`⏳ Aguardando SMS (até 2 minutos)...\`,
        { parse_mode: 'Markdown' }
      );

      // Aguardar código
      const codeResult = await sms.waitForCode(buyResult.activationId, 24, 5);

      if (codeResult.success) {
        await ctx.reply(
          \`✅ *Código recebido!*\n\n\` +
          \`📨 Código: \\`\${codeResult.code}\\`\n\n\` +
          \`✔️ Salve este código!\`,
          { parse_mode: 'Markdown' }
        );

        await sms.confirmSms(buyResult.activationId);
      } else {
        await ctx.reply(
          \`⏱ *Timeout!*\n\n\` +
          \`Não recebemos o SMS a tempo.\n\` +
          \`🔑 ID: \${buyResult.activationId}\n\n\` +
          \`Você pode verificar manualmente ou solicitar cancelamento.\`,
          { parse_mode: 'Markdown' }
        );
      }

    } catch (error) {
      console.error('Erro ao comprar SMS:', error);
      await ctx.reply('❌ Erro ao processar compra.');
    }
  });

  /**
   * COMPRAR SEGUIDORES - Menu de categorias
   */
  bot.hears(['👥 Comprar Seguidores', '/seguidores'], async (ctx) => {
    try {
      await ctx.reply(
        '🎯 *Escolha a plataforma:*',
        {
          parse_mode: 'Markdown',
          reply_markup: keyboards.apexCategoriesMenu().reply_markup
        }
      );
    } catch (error) {
      console.error('Erro ao exibir categorias:', error);
      await ctx.reply('❌ Erro ao carregar categorias.');
    }
  });

  /**
   * APEX - Callback de categorias
   */
  bot.action(/apex_cat_(.+)/, async (ctx) => {
    try {
      const category = ctx.match[1];
      await ctx.answerCbQuery();
      await ctx.editMessageText('🔄 Carregando serviços...');

      const servicesResult = await apex.getServices();

      if (!servicesResult.success) {
        return ctx.editMessageText('❌ Erro ao carregar serviços.');
      }

      const filtered = apex.filterServicesByCategory(servicesResult.services, category);

      if (filtered.length === 0) {
        return ctx.editMessageText('❌ Nenhum serviço disponível nesta categoria.');
      }

      let message = \`🎯 *Serviços - \${category.toUpperCase()}*\n\n\`;

      filtered.slice(0, 10).forEach((service, index) => {
        message += \`\${index + 1}. \${service.name.substring(0, 60)}\n\`;
        message += \`   💰 R$ \${service.price.toFixed(2)} (mín: \${service.min})\n\n\`;
      });

      message += '\n📝 Para comprar, envie:\n';
      message += '\`/comprar_apex ID LINK QUANTIDADE\`\n\n';
      message += 'Exemplo:\n';
      message += '\`/comprar_apex 123 https://instagram.com/perfil 1000\`';

      // Armazenar serviços no estado
      userStates[ctx.from.id] = {
        apexServices: filtered
      };

      await ctx.editMessageText(message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Erro ao processar categoria Apex:', error);
      await ctx.editMessageText('❌ Erro ao processar.');
    }
  });

  /**
   * COMPRAR APEX - Processar compra
   */
  bot.command('comprar_apex', async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const args = ctx.message.text.split(' ');

      if (args.length < 4) {
        return ctx.reply(
          '❌ Use: /comprar_apex ID LINK QUANTIDADE\n\n' +
          'Exemplo:\n' +
          '\`/comprar_apex 123 https://instagram.com/perfil 1000\`',
          { parse_mode: 'Markdown' }
        );
      }

      const serviceId = args[1];
      const link = args[2];
      const quantity = parseInt(args[3]);

      if (isNaN(quantity) || quantity <= 0) {
        return ctx.reply('❌ Quantidade inválida.');
      }

      // Buscar serviço
      const servicesResult = await apex.getServices();
      if (!servicesResult.success) {
        return ctx.reply('❌ Erro ao buscar serviços.');
      }

      const service = servicesResult.services.find(s => s.id == serviceId);
      if (!service) {
        return ctx.reply('❌ Serviço não encontrado.');
      }

      // Calcular preço
      const preco = (service.price * quantity) / 1000;

      // Validar quantidade mínima e máxima
      if (quantity < service.min) {
        return ctx.reply(\`❌ Quantidade mínima: \${service.min}\`);
      }
      if (quantity > service.max) {
        return ctx.reply(\`❌ Quantidade máxima: \${service.max}\`);
      }

      // Verificar saldo
      const balanceResult = await db.getUserBalance(telegramId);
      if (!balanceResult.success) {
        return ctx.reply('❌ Erro ao verificar saldo.');
      }

      const saldoAtual = balanceResult.saldo;

      // ====================================
      // FLUXO DE AUTO-COMPRA DE CRÉDITOS
      // ====================================
      if (saldoAtual < preco) {
        const falta = preco - saldoAtual;

        await ctx.reply(
          \`⚠️ *Saldo insuficiente!*\n\n\` +
          \`💰 Saldo atual: R$ \${saldoAtual.toFixed(2)}\n\` +
          \`🎯 Necessário: R$ \${preco.toFixed(2)}\n\` +
          \`📉 Falta: R$ \${falta.toFixed(2)}\n\n\` +
          \`🔄 Gerando cobrança automática...\`,
          { parse_mode: 'Markdown' }
        );

        // Criar cobrança Pix automática
        const pixResult = await paguepix.createPixCharge(
          falta,
          telegramId,
          \`Recarga automática - \${service.name}\`
        );

        if (!pixResult.success) {
          return ctx.reply('❌ Erro ao gerar cobrança Pix.');
        }

        const charge = pixResult.charge;

        // Salvar depósito
        await db.createDeposit(telegramId, falta, charge.txid, charge.id);

        // Criar registro de auto-retry
        await db.createAutoRetry(
          telegramId,
          {
            tipo: 'apex',
            serviceId: serviceId,
            serviceName: service.name,
            link: link,
            quantity: quantity,
            valor: preco
          },
          falta,
          charge.id
        );

        // Enviar QR Code e instruções
        await ctx.replyWithPhoto(
          { source: Buffer.from(charge.qrcode, 'base64') },
          {
            caption:
              \`💳 *Pague para liberar automaticamente seu pedido*\n\n\` +
              \`💰 Valor: R$ \${falta.toFixed(2)}\n\` +
              \`📱 Serviço: \${service.name}\n\` +
              \`📊 Quantidade: \${quantity}\n\n\` +
              \`📋 *Pix Copia e Cola:*\n\` +
              \`\\`\${charge.copiaCola}\\`\n\n\` +
              \`✅ Após o pagamento, seu pedido será processado automaticamente!\`,
            parse_mode: 'Markdown'
          }
        );

        return; // Fluxo de auto-compra iniciado
      }

      // ====================================
      // SALDO SUFICIENTE - PROCESSAR COMPRA
      // ====================================

      await ctx.reply('🔄 Criando pedido Apex...');

      const orderResult = await apex.createOrder(serviceId, link, quantity);

      if (!orderResult.success) {
        return ctx.reply(\`❌ Erro ao criar pedido: \${orderResult.error}\`);
      }

      // Descontar saldo
      await db.updateUserBalance(telegramId, preco, 'subtract');

      // Criar pedido
      await db.createOrder(
        telegramId,
        'apex',
        {
          serviceId: serviceId,
          orderId: orderResult.orderId,
          link: link,
          quantity: quantity
        },
        preco
      );

      await ctx.reply(
        \`✅ *Pedido criado com sucesso!*\n\n\` +
        \`📱 Serviço: \${service.name}\n\` +
        \`🆔 ID do pedido: \${orderResult.orderId}\n\` +
        \`📊 Quantidade: \${quantity}\n\` +
        \`💰 Cobrado: R$ \${preco.toFixed(2)}\n\n\` +
        \`Use /status_\${orderResult.orderId} para acompanhar.\`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('Erro ao comprar Apex:', error);
      await ctx.reply('❌ Erro ao processar compra.');
    }
  });

  /**
   * DEPOSITAR VIA PIX - Manual
   */
  bot.hears(['💰 Depositar via Pix', '/depositar'], async (ctx) => {
    try {
      await ctx.reply(
        '💵 *Depositar via Pix*\n\n' +
        'Envie o valor que deseja depositar:\n\n' +
        'Exemplo: \`50\` ou \`50.00\`',
        { parse_mode: 'Markdown' }
      );

      // Armazenar estado
      userStates[ctx.from.id] = {
        awaitingDepositAmount: true
      };

    } catch (error) {
      console.error('Erro ao iniciar depósito:', error);
      await ctx.reply('❌ Erro ao processar.');
    }
  });

  /**
   * PROCESSAR VALOR DO DEPÓSITO
   */
  bot.on('text', async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const state = userStates[telegramId];

      if (state && state.awaitingDepositAmount) {
        const valor = parseFloat(ctx.message.text.replace(',', '.'));

        if (isNaN(valor) || valor <= 0) {
          return ctx.reply('❌ Valor inválido. Envie um número válido.');
        }

        if (valor < 5) {
          return ctx.reply('❌ Valor mínimo: R$ 5,00');
        }

        delete userStates[telegramId];

        await ctx.reply('🔄 Gerando cobrança Pix...');

        const pixResult = await paguepix.createPixCharge(
          valor,
          telegramId,
          'Depósito manual'
        );

        if (!pixResult.success) {
          return ctx.reply('❌ Erro ao gerar cobrança Pix.');
        }

        const charge = pixResult.charge;

        // Salvar depósito
        await db.createDeposit(telegramId, valor, charge.txid, charge.id);

        // Enviar QR Code
        await ctx.replyWithPhoto(
          { source: Buffer.from(charge.qrcode, 'base64') },
          {
            caption:
              \`💳 *Pix gerado com sucesso!*\n\n\` +
              \`💰 Valor: R$ \${valor.toFixed(2)}\n\n\` +
              \`📋 *Pix Copia e Cola:*\n\` +
              \`\\`\${charge.copiaCola}\\`\n\n\` +
              \`✅ Após o pagamento, seu saldo será atualizado automaticamente!\`,
            parse_mode: 'Markdown'
          }
        );
      }
    } catch (error) {
      console.error('Erro ao processar texto:', error);
    }
  });

  /**
   * SUPORTE
   */
  bot.hears(['❓ Suporte', '/suporte'], async (ctx) => {
    await ctx.reply(
      '📞 *Suporte*\n\n' +
      'Entre em contato:\n' +
      '✉️ suporte@seubot.com\n' +
      '💬 @seusuporte',
      { parse_mode: 'Markdown' }
    );
  });

  /**
   * VOLTAR AO MENU
   */
  bot.hears(['🔙 Voltar ao Menu', '/menu'], async (ctx) => {
    await ctx.reply(
      '📋 *Menu Principal*\n\nEscolha uma opção:',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboards.mainMenu()
      }
    );
  });

  /**
   * CALLBACK MENU PRINCIPAL
   */
  bot.action('menu_main', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '📋 *Menu Principal*\n\nEscolha uma opção:',
      { parse_mode: 'Markdown' }
    );
  });

  return bot;
}

module.exports = { initBot };
