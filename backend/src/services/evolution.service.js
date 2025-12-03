const axios = require('axios');

const evolutionApi = axios.create({
  baseURL: process.env.EVOLUTION_API_URL,
  headers: {
    'apikey': process.env.EVOLUTION_API_KEY,
    'Content-Type': 'application/json'
  }
});

const INSTANCE = process.env.EVOLUTION_INSTANCE || 'confirma-party';

/**
 * Verifica o status da instância
 */
exports.getInstanceStatus = async () => {
  try {
    const response = await evolutionApi.get(`/instance/connectionState/${INSTANCE}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao verificar status:', error.response?.data || error.message);
    throw new Error('Erro ao verificar status da conexão WhatsApp');
  }
};

/**
 * Gera QR Code para conectar WhatsApp
 */
exports.getQRCode = async () => {
  try {
    const response = await evolutionApi.get(`/instance/connect/${INSTANCE}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error.response?.data || error.message);
    throw new Error('Erro ao gerar QR Code');
  }
};

/**
 * Cria uma nova instância
 */
exports.createInstance = async () => {
  try {
    const response = await evolutionApi.post('/instance/create', {
      instanceName: INSTANCE,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS'
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao criar instância:', error.response?.data || error.message);
    throw new Error('Erro ao criar instância WhatsApp');
  }
};

/**
 * Envia mensagem de texto
 */
exports.sendTextMessage = async (phone, message) => {
  try {
    // Formata o número (Brasil)
    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = '55' + formattedPhone;
    }

    const response = await evolutionApi.post(`/message/sendText/${INSTANCE}`, {
      number: formattedPhone,
      text: message
    });

    return {
      success: true,
      messageId: response.data?.key?.id,
      data: response.data
    };
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

/**
 * Envia mensagem para múltiplos números
 */
exports.sendBulkMessages = async (guests, messageTemplate) => {
  const results = [];

  for (const guest of guests) {
    const personalizedMessage = messageTemplate.replace('{nome_convidado}', guest.name);

    const result = await exports.sendTextMessage(guest.phone, personalizedMessage);

    results.push({
      guestId: guest.id,
      guestName: guest.name,
      phone: guest.phone,
      ...result
    });

    // Delay entre mensagens para evitar bloqueio
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
};

/**
 * Configura webhook para receber mensagens
 */
exports.setWebhook = async (webhookUrl) => {
  try {
    const response = await evolutionApi.post(`/webhook/set/${INSTANCE}`, {
      webhook: {
        enabled: true,
        url: webhookUrl,
        webhookByEvents: true,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'CONNECTION_UPDATE'
        ]
      }
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao configurar webhook:', error.response?.data || error.message);
    throw new Error('Erro ao configurar webhook');
  }
};

/**
 * Desconecta a instância
 */
exports.logout = async () => {
  try {
    const response = await evolutionApi.delete(`/instance/logout/${INSTANCE}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao desconectar:', error.response?.data || error.message);
    throw new Error('Erro ao desconectar WhatsApp');
  }
};
