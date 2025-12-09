const axios = require('axios');

/**
 * WhatsApp Cloud API Service (Meta)
 * Documentação: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const WHATSAPP_API_VERSION = 'v18.0';
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

// Configurações do ambiente
const config = {
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
};

/**
 * Formata número de telefone para o formato do WhatsApp (apenas números com código do país)
 */
function formatPhoneNumber(phone) {
  // Remove tudo que não é número
  let cleaned = phone.replace(/\D/g, '');

  // Se não começa com 55 (Brasil), adiciona
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }

  // Se tem 12 dígitos (55 + DDD + 8 dígitos), adiciona o 9
  if (cleaned.length === 12) {
    cleaned = cleaned.slice(0, 4) + '9' + cleaned.slice(4);
  }

  return cleaned;
}

/**
 * Envia mensagem de texto simples
 * @param {string} to - Número do destinatário
 * @param {string} text - Texto da mensagem
 */
exports.sendTextMessage = async (to, text) => {
  try {
    const phoneNumber = formatPhoneNumber(to);

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${config.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'text',
        text: {
          preview_url: false,
          body: text
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      messageId: response.data.messages?.[0]?.id,
      phone: phoneNumber
    };
  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message,
      errorCode: error.response?.data?.error?.code
    };
  }
};

/**
 * Envia mensagem usando template aprovado
 * @param {string} to - Número do destinatário
 * @param {string} templateName - Nome do template
 * @param {string} languageCode - Código do idioma (ex: pt_BR)
 * @param {Array} components - Componentes do template (header, body, buttons)
 */
exports.sendTemplateMessage = async (to, templateName, languageCode = 'pt_BR', components = []) => {
  try {
    const phoneNumber = formatPhoneNumber(to);

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phoneNumber,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode
        }
      }
    };

    // Adiciona componentes se existirem
    if (components.length > 0) {
      payload.template.components = components;
    }

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${config.phoneNumberId}/messages`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      messageId: response.data.messages?.[0]?.id,
      phone: phoneNumber
    };
  } catch (error) {
    console.error('Erro ao enviar template:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message,
      errorCode: error.response?.data?.error?.code
    };
  }
};

/**
 * Cria um template de mensagem na conta do WhatsApp Business
 * @param {Object} templateData - Dados do template
 */
exports.createMessageTemplate = async (templateData) => {
  try {
    const { name, category, language, components } = templateData;

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${config.businessAccountId}/message_templates`,
      {
        name,
        category: category || 'UTILITY', // UTILITY, MARKETING, AUTHENTICATION
        language,
        components
      },
      {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      templateId: response.data.id,
      status: response.data.status
    };
  } catch (error) {
    console.error('Erro ao criar template:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
};

/**
 * Lista templates disponíveis
 */
exports.listTemplates = async () => {
  try {
    const response = await axios.get(
      `${WHATSAPP_API_URL}/${config.businessAccountId}/message_templates`,
      {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`
        },
        params: {
          limit: 100
        }
      }
    );

    return {
      success: true,
      templates: response.data.data
    };
  } catch (error) {
    console.error('Erro ao listar templates:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
};

/**
 * Obtém status de um template
 */
exports.getTemplateStatus = async (templateName) => {
  try {
    const response = await axios.get(
      `${WHATSAPP_API_URL}/${config.businessAccountId}/message_templates`,
      {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`
        },
        params: {
          name: templateName
        }
      }
    );

    const template = response.data.data?.[0];

    if (!template) {
      return { success: false, error: 'Template não encontrado' };
    }

    return {
      success: true,
      template: {
        id: template.id,
        name: template.name,
        status: template.status, // APPROVED, PENDING, REJECTED
        category: template.category,
        language: template.language
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
};

/**
 * Deleta um template
 */
exports.deleteTemplate = async (templateName) => {
  try {
    const response = await axios.delete(
      `${WHATSAPP_API_URL}/${config.businessAccountId}/message_templates`,
      {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`
        },
        params: {
          name: templateName
        }
      }
    );

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
};

/**
 * Marca mensagem como lida
 */
exports.markAsRead = async (messageId) => {
  try {
    await axios.post(
      `${WHATSAPP_API_URL}/${config.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      },
      {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Obtém informações do número de telefone business
 */
exports.getPhoneInfo = async () => {
  try {
    const response = await axios.get(
      `${WHATSAPP_API_URL}/${config.phoneNumberId}`,
      {
        headers: {
          'Authorization': `Bearer ${config.accessToken}`
        },
        params: {
          fields: 'verified_name,code_verification_status,display_phone_number,quality_rating,platform_type,throughput'
        }
      }
    );

    return {
      success: true,
      phone: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
};

/**
 * Verifica webhook (GET request do WhatsApp para validar)
 */
exports.verifyWebhook = (req) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.webhookVerifyToken) {
    return { success: true, challenge };
  }

  return { success: false };
};

/**
 * Processa payload de webhook recebido
 * @param {Object} body - Corpo do webhook
 * @returns {Object} - Mensagem extraída ou null
 */
exports.parseWebhookMessage = (body) => {
  try {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // Verificar se é uma mensagem
    if (!value?.messages?.[0]) {
      return null;
    }

    const message = value.messages[0];
    const contact = value.contacts?.[0];

    return {
      messageId: message.id,
      from: message.from, // Número do remetente
      timestamp: message.timestamp,
      type: message.type, // text, image, audio, etc.
      text: message.text?.body || '',
      contactName: contact?.profile?.name || '',
      // Outros tipos de mensagem
      image: message.image,
      audio: message.audio,
      document: message.document,
      location: message.location,
      button: message.button,
      interactive: message.interactive
    };
  } catch (error) {
    console.error('Erro ao parsear webhook:', error);
    return null;
  }
};

/**
 * Verifica status de entrega de mensagem a partir do webhook
 */
exports.parseWebhookStatus = (body) => {
  try {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.statuses?.[0]) {
      return null;
    }

    const status = value.statuses[0];

    return {
      messageId: status.id,
      recipientId: status.recipient_id,
      status: status.status, // sent, delivered, read, failed
      timestamp: status.timestamp,
      error: status.errors?.[0]
    };
  } catch (error) {
    return null;
  }
};

/**
 * Envia mensagens em lote para vários destinatários
 * @param {Array} guests - Lista de convidados [{name, phone}]
 * @param {string} messageTemplate - Template da mensagem com {nome_convidado}
 * @param {number} delayMs - Delay entre mensagens em ms (mínimo recomendado: 1000)
 */
exports.sendBulkMessages = async (guests, messageTemplate, delayMs = 2000) => {
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

    // Delay entre mensagens para evitar rate limiting
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
};

/**
 * Verifica se o serviço está configurado corretamente
 */
exports.isConfigured = () => {
  return !!(config.phoneNumberId && config.accessToken);
};

/**
 * Obtém configuração atual (sem expor token)
 */
exports.getConfig = () => {
  return {
    configured: exports.isConfigured(),
    phoneNumberId: config.phoneNumberId ? `***${config.phoneNumberId.slice(-4)}` : null,
    hasAccessToken: !!config.accessToken,
    hasBusinessAccountId: !!config.businessAccountId
  };
};
