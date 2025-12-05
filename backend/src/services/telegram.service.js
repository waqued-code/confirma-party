const axios = require('axios');

// Send notification message to Telegram
exports.sendNewUserNotification = async (user) => {
  try {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.warn('Telegram not configured - skipping notification');
      console.warn('BOT_TOKEN:', TELEGRAM_BOT_TOKEN ? 'set' : 'missing');
      console.warn('CHAT_ID:', TELEGRAM_CHAT_ID ? 'set' : 'missing');
      return false;
    }

    const message = `
🎉 *Novo cadastro no Confirma.Party!*

👤 *Nome:* ${user.name}
📧 *Email:* ${user.email}
📱 *Telefone:* ${user.phone || 'Não informado'}

🕐 _${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}_
    `.trim();

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const response = await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    });

    console.log('Telegram notification sent:', response.data.result.message_id);
    return true;
  } catch (error) {
    console.error('Erro ao enviar notificacao Telegram:', error.message);
    return false;
  }
};
