const axios = require('axios');

// URL base da API PaguePix
const BASE_URL = 'https://api.paguepix.com/v1';

// Configurações da API
const config = {
  apiKey: process.env.PAGUEPIX_API_KEY,
  secretKey: process.env.PAGUEPIX_SECRET_KEY,
  pixKey: process.env.PAGUEPIX_PIX_KEY
};

/**
 * Criar cobrança Pix
 */
async function createPixCharge(valor, telegramId, descricao = 'Recarga de créditos') {
  try {
    const response = await axios.post(
      `${BASE_URL}/charges`,
      {
        value: parseFloat(valor).toFixed(2),
        description: descricao,
        pix_key: config.pixKey,
        customer: {
          name: `Telegram User ${telegramId}`,
          tax_id: telegramId.toString()
        },
        expires_in: 3600 // 1 hora
      },
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = response.data;

    return {
      success: true,
      charge: {
        id: data.id,
        txid: data.transaction_id || data.id,
        valor: valor,
        qrcode: data.qr_code_base64,
        copiaCola: data.brcode || data.qr_code,
        status: data.status,
        expiresAt: data.expires_at
      }
    };
  } catch (error) {
    console.error('Erro ao criar cobrança Pix:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

/**
 * Consultar status da cobrança
 */
async function getChargeStatus(chargeId) {
  try {
    const response = await axios.get(
      `${BASE_URL}/charges/${chargeId}`,
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        }
      }
    );

    const data = response.data;

    return {
      success: true,
      status: data.status,
      paid: data.status === 'paid' || data.status === 'confirmed',
      charge: data
    };
  } catch (error) {
    console.error('Erro ao consultar status:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

/**
 * Validar webhook (verificar autenticidade)
 */
function validateWebhook(receivedSignature, payload) {
  try {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', config.secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    return receivedSignature === expectedSignature;
  } catch (error) {
    console.error('Erro ao validar webhook:', error);
    return false;
  }
}

/**
 * Processar webhook de pagamento
 */
async function processWebhook(webhookData) {
  try {
    const { event, data } = webhookData;

    // Verificar se é evento de pagamento confirmado
    if (event === 'charge.paid' || event === 'charge.confirmed') {
      return {
        success: true,
        paid: true,
        chargeId: data.id,
        txid: data.transaction_id || data.id,
        valor: parseFloat(data.value),
        customerTaxId: data.customer?.tax_id
      };
    }

    return {
      success: true,
      paid: false,
      event
    };
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  createPixCharge,
  getChargeStatus,
  validateWebhook,
  processWebhook
};
