const { Markup } = require('telegraf');

/**
 * Menu principal
 */
function mainMenu() {
  return Markup.keyboard([
    ['📱 Comprar SMS', '👥 Comprar Seguidores'],
    ['💰 Depositar via Pix', '💳 Meu Saldo'],
    ['❓ Suporte']
  ])
  .resize()
  .reply_markup;
}

/**
 * Menu voltar
 */
function backMenu() {
  return Markup.keyboard([
    ['🔙 Voltar ao Menu']
  ])
  .resize()
  .reply_markup;
}

/**
 * Menu SMS - Serviços
 */
function smsServicesMenu(services) {
  const buttons = services.slice(0, 10).map(service => 
    [Markup.button.callback(
      `${service.name} - R$ ${service.price.toFixed(2)}`,
      `sms_buy_${service.code}`
    )]
  );

  buttons.push([Markup.button.callback('🔙 Voltar', 'menu_main')]);

  return Markup.inlineKeyboard(buttons);
}

/**
 * Menu Apex - Categorias
 */
function apexCategoriesMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📷 Instagram', 'apex_cat_instagram')],
    [Markup.button.callback('▶️ YouTube', 'apex_cat_youtube')],
    [Markup.button.callback('📘 Facebook', 'apex_cat_facebook')],
    [Markup.button.callback('🎵 TikTok', 'apex_cat_tiktok')],
    [Markup.button.callback('🐦 Twitter', 'apex_cat_twitter')],
    [Markup.button.callback('🔙 Voltar', 'menu_main')]
  ]);
}

/**
 * Menu Apex - Serviços por categoria
 */
function apexServicesMenu(services) {
  const buttons = services.slice(0, 8).map(service => 
    [Markup.button.callback(
      `${service.name.substring(0, 50)} - R$ ${service.price.toFixed(2)}`,
      `apex_buy_${service.id}`
    )]
  );

  buttons.push([Markup.button.callback('🔙 Voltar', 'apex_categories')]);

  return Markup.inlineKeyboard(buttons);
}

/**
 * Menu de confirmação de pagamento
 */
function paymentConfirmMenu(pixId) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Já paguei', `check_payment_${pixId}`)],
    [Markup.button.callback('❌ Cancelar', 'cancel_payment')]
  ]);
}

/**
 * Remove teclado
 */
function removeKeyboard() {
  return Markup.removeKeyboard();
}

module.exports = {
  mainMenu,
  backMenu,
  smsServicesMenu,
  apexCategoriesMenu,
  apexServicesMenu,
  paymentConfirmMenu,
  removeKeyboard
};
