const { createClient } = require('@supabase/supabase-js');

// Inicializar cliente Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

/**
 * GERENCIAMENTO DE USUÁRIOS
 */

// Registrar ou buscar usuário
async function getOrCreateUser(telegramId, username = null) {
  try {
    // Verificar se usuário existe
    const { data: existing, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();

    if (existing) {
      return { success: true, user: existing };
    }

    // Criar novo usuário
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([
        {
          telegram_id: telegramId,
          username: username,
          saldo: 0,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (createError) throw createError;

    return { success: true, user: newUser };
  } catch (error) {
    console.error('Erro ao buscar/criar usuário:', error);
    return { success: false, error: error.message };
  }
}

// Obter saldo do usuário
async function getUserBalance(telegramId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('saldo')
      .eq('telegram_id', telegramId)
      .single();

    if (error) throw error;
    return { success: true, saldo: data.saldo };
  } catch (error) {
    console.error('Erro ao obter saldo:', error);
    return { success: false, error: error.message };
  }
}

// Atualizar saldo do usuário
async function updateUserBalance(telegramId, valor, operacao = 'add') {
  try {
    // Buscar saldo atual
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('saldo')
      .eq('telegram_id', telegramId)
      .single();

    if (fetchError) throw fetchError;

    // Calcular novo saldo
    const novoSaldo = operacao === 'add' 
      ? parseFloat(user.saldo) + parseFloat(valor)
      : parseFloat(user.saldo) - parseFloat(valor);

    // Atualizar saldo
    const { data, error } = await supabase
      .from('users')
      .update({ saldo: novoSaldo })
      .eq('telegram_id', telegramId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, novoSaldo };
  } catch (error) {
    console.error('Erro ao atualizar saldo:', error);
    return { success: false, error: error.message };
  }
}

/**
 * GERENCIAMENTO DE DEPÓSITOS
 */

// Criar depósito
async function createDeposit(telegramId, valor, txid, pixId = null) {
  try {
    const { data, error } = await supabase
      .from('deposits')
      .insert([
        {
          telegram_id: telegramId,
          valor: parseFloat(valor),
          txid: txid,
          pix_id: pixId,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, deposit: data };
  } catch (error) {
    console.error('Erro ao criar depósito:', error);
    return { success: false, error: error.message };
  }
}

// Confirmar depósito
async function confirmDeposit(txid) {
  try {
    const { data, error } = await supabase
      .from('deposits')
      .update({ status: 'confirmed' })
      .eq('txid', txid)
      .select()
      .single();

    if (error) throw error;
    return { success: true, deposit: data };
  } catch (error) {
    console.error('Erro ao confirmar depósito:', error);
    return { success: false, error: error.message };
  }
}

// Buscar depósito por txid
async function getDepositByTxid(txid) {
  try {
    const { data, error } = await supabase
      .from('deposits')
      .select('*')
      .eq('txid', txid)
      .single();

    if (error) throw error;
    return { success: true, deposit: data };
  } catch (error) {
    console.error('Erro ao buscar depósito:', error);
    return { success: false, error: error.message };
  }
}

/**
 * GERENCIAMENTO DE PEDIDOS
 */

// Criar pedido
async function createOrder(telegramId, tipo, parametros, valor) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          telegram_id: telegramId,
          tipo: tipo,
          parametros: parametros,
          valor: parseFloat(valor),
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, order: data };
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    return { success: false, error: error.message };
  }
}

// Atualizar status do pedido
async function updateOrderStatus(orderId, status, resultado = null) {
  try {
    const updateData = { status };
    if (resultado) {
      updateData.resultado = resultado;
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, order: data };
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error);
    return { success: false, error: error.message };
  }
}

/**
 * GERENCIAMENTO DE AUTO-RETRIES
 */

// Criar registro de auto-retry
async function createAutoRetry(telegramId, pedidoOriginal, falta, pixId) {
  try {
    const { data, error } = await supabase
      .from('auto_retries')
      .insert([
        {
          telegram_id: telegramId,
          pedido_original: pedidoOriginal,
          falta: parseFloat(falta),
          pix_id: pixId,
          status: 'waiting_payment',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, retry: data };
  } catch (error) {
    console.error('Erro ao criar auto-retry:', error);
    return { success: false, error: error.message };
  }
}

// Buscar auto-retry por pix_id
async function getAutoRetryByPixId(pixId) {
  try {
    const { data, error } = await supabase
      .from('auto_retries')
      .select('*')
      .eq('pix_id', pixId)
      .eq('status', 'waiting_payment')
      .single();

    if (error) throw error;
    return { success: true, retry: data };
  } catch (error) {
    console.error('Erro ao buscar auto-retry:', error);
    return { success: false, error: error.message };
  }
}

// Atualizar status do auto-retry
async function updateAutoRetryStatus(id, status) {
  try {
    const { data, error } = await supabase
      .from('auto_retries')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, retry: data };
  } catch (error) {
    console.error('Erro ao atualizar auto-retry:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  supabase,
  getOrCreateUser,
  getUserBalance,
  updateUserBalance,
  createDeposit,
  confirmDeposit,
  getDepositByTxid,
  createOrder,
  updateOrderStatus,
  createAutoRetry,
  getAutoRetryByPixId,
  updateAutoRetryStatus
};
