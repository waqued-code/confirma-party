const axios = require('axios');

// Usa Baileys em vez de Evolution API
// Define WHATSAPP_MODE=evolution no .env para usar Evolution API
const USE_BAILEYS = process.env.WHATSAPP_MODE !== 'evolution';

let baileysService = null;
if (USE_BAILEYS) {
  baileysService = require('./whatsappBaileys.service');
  // Inicializa a conexão automaticamente
  baileysService.initialize().catch(err => {
    console.error('[WhatsApp] Erro na inicialização:', err.message);
  });
}

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
  if (USE_BAILEYS && baileysService) {
    return baileysService.getConnectionStatus();
  }

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
  if (USE_BAILEYS && baileysService) {
    const status = baileysService.getConnectionStatus();

    // Se já está conectado, retorna o status
    if (status.connected) {
      return {
        status: 'connected',
        phoneNumber: status.phoneNumber,
        message: 'WhatsApp já está conectado'
      };
    }

    // Se tem QR Code disponível, retorna
    if (status.qrDataUrl) {
      return {
        status: 'qr_pending',
        qrCode: status.qrCode,
        qrDataUrl: status.qrDataUrl,
        message: 'Escaneie o QR Code para conectar'
      };
    }

    // Gera novo QR Code
    const newStatus = await baileysService.generateNewQRCode();
    return {
      status: newStatus.status,
      qrCode: newStatus.qrCode,
      qrDataUrl: newStatus.qrDataUrl,
      message: newStatus.qrDataUrl ? 'QR Code gerado' : 'Aguarde o QR Code...'
    };
  }

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
  if (USE_BAILEYS) {
    return await exports.getQRCode();
  }

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
  if (USE_BAILEYS && baileysService) {
    return baileysService.sendTextMessage(phone, message);
  }

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
  if (USE_BAILEYS && baileysService) {
    const messages = guests.map(guest => ({
      phone: guest.phone,
      message: messageTemplate.replace('{nome_convidado}', guest.name),
      guestId: guest.id,
      guestName: guest.name
    }));

    const results = await baileysService.sendBulkMessages(messages, 3000);

    return results.map(r => ({
      guestId: r.guestId,
      guestName: r.guestName,
      phone: r.phone,
      success: r.success,
      messageId: r.messageId,
      error: r.error
    }));
  }

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
 * Verifica se um número existe no WhatsApp
 */
exports.checkNumberExists = async (phone) => {
  if (USE_BAILEYS && baileysService) {
    return baileysService.checkNumberExists(phone);
  }

  // Evolution API não tem esse endpoint facilmente
  return { exists: true };
};

/**
 * Configura webhook para receber mensagens
 */
exports.setWebhook = async (webhookUrl) => {
  if (USE_BAILEYS) {
    return { message: 'Webhook não necessário - Baileys processa mensagens diretamente' };
  }

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
  if (USE_BAILEYS && baileysService) {
    await baileysService.disconnect();
    return { message: 'Desconectado com sucesso' };
  }

  try {
    const response = await evolutionApi.delete(`/instance/logout/${INSTANCE}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao desconectar:', error.response?.data || error.message);
    throw new Error('Erro ao desconectar WhatsApp');
  }
};

/**
 * Limpa credenciais e gera novo QR Code
 */
exports.resetConnection = async () => {
  if (USE_BAILEYS && baileysService) {
    return baileysService.generateNewQRCode();
  }

  // Para Evolution API, desconecta e reconecta
  await exports.logout();
  return exports.getQRCode();
};
