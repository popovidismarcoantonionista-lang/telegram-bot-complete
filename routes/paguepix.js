const express = require('express');
const router = express.Router();
const paguepix = require('../services/paguepix');
const db = require('../database/supabase');

/**
 * Webhook do PaguePix
 * Recebe notificações de pagamento confirmado
 */
router.post('/webhook', async (req, res) => {
  try {
    console.log('📥 Webhook PaguePix recebido:', JSON.stringify(req.body));

    // Validar assinatura (opcional mas recomendado)
    const signature = req.headers['x-paguepix-signature'];
    if (signature && !paguepix.validateWebhook(signature, req.body)) {
      console.error('❌ Assinatura inválida');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Processar webhook
    const result = await paguepix.processWebhook(req.body);

    if (!result.success) {
      console.error('❌ Erro ao processar webhook:', result.error);
      return res.status(400).json({ error: result.error });
    }

    // Verificar se é pagamento confirmado
    if (result.paid) {
      console.log('✅ Pagamento confirmado:', result.txid);

      // Buscar depósito
      const depositResult = await db.getDepositByTxid(result.txid);

      if (depositResult.success && depositResult.deposit) {
        const deposit = depositResult.deposit;

        // Confirmar depósito
        await db.confirmDeposit(result.txid);

        // Adicionar saldo ao usuário
        await db.updateUserBalance(deposit.telegram_id, result.valor, 'add');

        console.log(`💰 Saldo adicionado para usuário ${deposit.telegram_id}: R$ ${result.valor}`);

        // Verificar se é um auto-retry
        const retryResult = await db.getAutoRetryByPixId(result.chargeId);

        if (retryResult.success && retryResult.retry) {
          console.log('🔄 Auto-retry detectado, processando pedido original...');

          const retry = retryResult.retry;
          const pedidoOriginal = retry.pedido_original;

          // Atualizar status do retry
          await db.updateAutoRetryStatus(retry.id, 'completed');

          // Notificar bot para reprocessar pedido
          // Envia mensagem via bot (será implementado no bot.js)
          if (global.bot) {
            const ctx = {
              telegram: global.bot.telegram,
              from: { id: retry.telegram_id }
            };

            try {
              await ctx.telegram.sendMessage(
                retry.telegram_id,
                '✅ *Pagamento confirmado!*\n\n' +
                '💰 Seu saldo foi atualizado.\n' +
                '🔄 Processando seu pedido automaticamente...',
                { parse_mode: 'Markdown' }
              );

              // Reprocessar pedido original
              if (pedidoOriginal.tipo === 'sms') {
                // Reprocessar compra de SMS
                const sms = require('../services/sms');
                const buyResult = await sms.buyNumber(pedidoOriginal.serviceCode);

                if (buyResult.success) {
                  await ctx.telegram.sendMessage(
                    retry.telegram_id,
                    `📱 *Número SMS adquirido!*\n\n` +
                    `📞 Número: +${buyResult.phoneNumber}\n` +
                    `🔑 ID: ${buyResult.activationId}\n\n` +
                    `⏳ Aguardando SMS...`,
                    { parse_mode: 'Markdown' }
                  );

                  // Aguardar código
                  const codeResult = await sms.waitForCode(buyResult.activationId);

                  if (codeResult.success) {
                    await ctx.telegram.sendMessage(
                      retry.telegram_id,
                      `✅ *Código recebido!*\n\n` +
                      `📨 Código: \`${codeResult.code}\``,
                      { parse_mode: 'Markdown' }
                    );
                    await sms.confirmSms(buyResult.activationId);
                  }
                }

              } else if (pedidoOriginal.tipo === 'apex') {
                // Reprocessar compra Apex
                const apex = require('../services/apex');
                const orderResult = await apex.createOrder(
                  pedidoOriginal.serviceId,
                  pedidoOriginal.link,
                  pedidoOriginal.quantity
                );

                if (orderResult.success) {
                  await ctx.telegram.sendMessage(
                    retry.telegram_id,
                    `✅ *Pedido Apex criado!*\n\n` +
                    `🆔 ID do pedido: ${orderResult.orderId}\n\n` +
                    `📊 Use /status_${orderResult.orderId} para acompanhar`,
                    { parse_mode: 'Markdown' }
                  );
                }
              }

              // Descontar saldo
              await db.updateUserBalance(retry.telegram_id, pedidoOriginal.valor, 'subtract');

            } catch (error) {
              console.error('Erro ao processar auto-retry:', error);
            }
          }
        } else {
          // Depósito manual normal
          if (global.bot) {
            await global.bot.telegram.sendMessage(
              deposit.telegram_id,
              `✅ *Pagamento confirmado!*\n\n` +
              `💰 R$ ${result.valor.toFixed(2)} adicionados ao seu saldo.\n\n` +
              `Use o menu para realizar suas compras! 🚀`,
              { parse_mode: 'Markdown' }
            );
          }
        }
      }
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('❌ Erro no webhook PaguePix:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
