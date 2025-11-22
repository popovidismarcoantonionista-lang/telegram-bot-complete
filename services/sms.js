const axios = require('axios');

// URL base da API SMS-Activate
const BASE_URL = 'https://api.sms-activate.org/stubs/handler_api.php';
const API_KEY = process.env.SMS_ACTIVATE_API_KEY;

/**
 * Listar serviços disponíveis com preços
 */
async function getServices(country = 'br') {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        api_key: API_KEY,
        action: 'getPrices',
        country: country
      }
    });

    const data = response.data;

    // Extrair serviços principais
    const services = [];
    if (data[country]) {
      for (const [serviceCode, serviceData] of Object.entries(data[country])) {
        services.push({
          code: serviceCode,
          name: serviceData.name || serviceCode,
          price: parseFloat(serviceData.cost || 0),
          count: serviceData.count || 0
        });
      }
    }

    // Ordenar por preço
    services.sort((a, b) => a.price - b.price);

    return {
      success: true,
      services: services.slice(0, 20) // Top 20 serviços
    };
  } catch (error) {
    console.error('Erro ao listar serviços SMS:', error.response?.data || error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obter saldo da conta SMS-Activate
 */
async function getBalance() {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        api_key: API_KEY,
        action: 'getBalance'
      }
    });

    const balance = response.data.replace('ACCESS_BALANCE:', '');

    return {
      success: true,
      balance: parseFloat(balance)
    };
  } catch (error) {
    console.error('Erro ao obter saldo SMS:', error.response?.data || error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Comprar número para receber SMS
 */
async function buyNumber(serviceCode, country = 'br') {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        api_key: API_KEY,
        action: 'getNumber',
        service: serviceCode,
        country: country
      }
    });

    const data = response.data;

    if (data.includes('ACCESS_NUMBER')) {
      const [status, activationId, phoneNumber] = data.split(':');

      return {
        success: true,
        activationId: activationId,
        phoneNumber: phoneNumber,
        serviceCode: serviceCode
      };
    } else {
      return {
        success: false,
        error: data
      };
    }
  } catch (error) {
    console.error('Erro ao comprar número SMS:', error.response?.data || error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Buscar código SMS recebido
 */
async function getCode(activationId) {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        api_key: API_KEY,
        action: 'getStatus',
        id: activationId
      }
    });

    const data = response.data;

    if (data.includes('STATUS_OK')) {
      const code = data.split(':')[1];
      return {
        success: true,
        code: code,
        received: true
      };
    } else if (data === 'STATUS_WAIT_CODE') {
      return {
        success: true,
        received: false,
        waiting: true
      };
    } else {
      return {
        success: false,
        error: data
      };
    }
  } catch (error) {
    console.error('Erro ao buscar código SMS:', error.response?.data || error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Cancelar número/ativação
 */
async function cancelNumber(activationId) {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        api_key: API_KEY,
        action: 'setStatus',
        status: 8, // Cancelar
        id: activationId
      }
    });

    return {
      success: true,
      message: 'Número cancelado'
    };
  } catch (error) {
    console.error('Erro ao cancelar número SMS:', error.response?.data || error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Confirmar recebimento do SMS
 */
async function confirmSms(activationId) {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        api_key: API_KEY,
        action: 'setStatus',
        status: 6, // Confirmar
        id: activationId
      }
    });

    return {
      success: true,
      message: 'SMS confirmado'
    };
  } catch (error) {
    console.error('Erro ao confirmar SMS:', error.response?.data || error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Aguardar código SMS automaticamente (polling)
 */
async function waitForCode(activationId, maxAttempts = 24, intervalSeconds = 5) {
  return new Promise((resolve) => {
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;

      const result = await getCode(activationId);

      if (result.success && result.received) {
        clearInterval(interval);
        resolve({
          success: true,
          code: result.code
        });
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        resolve({
          success: false,
          timeout: true,
          message: 'Timeout aguardando SMS'
        });
      }
    }, intervalSeconds * 1000);
  });
}

module.exports = {
  getServices,
  getBalance,
  buyNumber,
  getCode,
  cancelNumber,
  confirmSms,
  waitForCode
};
