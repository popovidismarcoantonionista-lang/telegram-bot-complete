const axios = require('axios');

// URL base da API Apex
const BASE_URL = 'https://apexseguidores.com.br/api/v2';
const API_KEY = process.env.APEX_API_KEY;

/**
 * Listar serviços disponíveis
 */
async function getServices() {
  try {
    const response = await axios.post(BASE_URL, {
      key: API_KEY,
      action: 'services'
    });

    const services = response.data;

    // Filtrar e formatar serviços
    const formattedServices = services.map(service => ({
      id: service.service,
      name: service.name,
      type: service.type,
      category: service.category,
      price: parseFloat(service.rate),
      min: service.min,
      max: service.max,
      description: service.description || ''
    }));

    return {
      success: true,
      services: formattedServices
    };
  } catch (error) {
    console.error('Erro ao listar serviços Apex:', error.response?.data || error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obter saldo da conta
 */
async function getBalance() {
  try {
    const response = await axios.post(BASE_URL, {
      key: API_KEY,
      action: 'balance'
    });

    return {
      success: true,
      balance: parseFloat(response.data.balance),
      currency: response.data.currency
    };
  } catch (error) {
    console.error('Erro ao obter saldo Apex:', error.response?.data || error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Criar pedido (add)
 */
async function createOrder(serviceId, link, quantity) {
  try {
    const response = await axios.post(BASE_URL, {
      key: API_KEY,
      action: 'add',
      service: serviceId,
      link: link,
      quantity: quantity
    });

    return {
      success: true,
      orderId: response.data.order,
      message: 'Pedido criado com sucesso'
    };
  } catch (error) {
    console.error('Erro ao criar pedido Apex:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
}

/**
 * Consultar status do pedido
 */
async function getOrderStatus(orderId) {
  try {
    const response = await axios.post(BASE_URL, {
      key: API_KEY,
      action: 'status',
      order: orderId
    });

    const data = response.data;

    return {
      success: true,
      status: data.status,
      charge: data.charge,
      startCount: data.start_count,
      remains: data.remains,
      currency: data.currency
    };
  } catch (error) {
    console.error('Erro ao consultar status Apex:', error.response?.data || error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Buscar múltiplos pedidos
 */
async function getMultipleOrderStatus(orderIds) {
  try {
    const response = await axios.post(BASE_URL, {
      key: API_KEY,
      action: 'status',
      orders: orderIds.join(',')
    });

    return {
      success: true,
      orders: response.data
    };
  } catch (error) {
    console.error('Erro ao consultar múltiplos pedidos Apex:', error.response?.data || error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Filtrar serviços por categoria
 */
function filterServicesByCategory(services, category) {
  return services.filter(service => 
    service.category.toLowerCase().includes(category.toLowerCase())
  );
}

/**
 * Buscar serviço por nome
 */
function findServiceByName(services, searchTerm) {
  const term = searchTerm.toLowerCase();
  return services.filter(service => 
    service.name.toLowerCase().includes(term) ||
    service.category.toLowerCase().includes(term)
  );
}

module.exports = {
  getServices,
  getBalance,
  createOrder,
  getOrderStatus,
  getMultipleOrderStatus,
  filterServicesByCategory,
  findServiceByName
};
