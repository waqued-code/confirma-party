const { PrismaClient } = require('@prisma/client');
const claudeService = require('../services/claude.service');
const whatsappCloudService = require('../services/whatsappCloud.service');

const prisma = new PrismaClient();

/**
 * Verifica webhook do WhatsApp Cloud API (GET)
 */
exports.verifyWhatsAppWebhook = (req, res) => {
  const result = whatsappCloudService.verifyWebhook(req);

  if (result.success) {
    console.log('Webhook verificado com sucesso');
    res.status(200).send(result.challenge);
  } else {
    console.log('Falha na verificação do webhook');
    res.status(403).send('Forbidden');
  }
};

/**
 * Processa webhooks do WhatsApp Cloud API (POST)
 */
exports.handleWhatsAppWebhook = async (req, res) => {
  try {
    // Responde imediatamente para não timeout (WhatsApp espera resposta rápida)
    res.status(200).send('EVENT_RECEIVED');

    // Parse da mensagem
    const message = whatsappCloudService.parseWebhookMessage(req.body);

    if (message && message.type === 'text' && message.text) {
      await processIncomingMessage(message);
    }

    // Parse de status (entrega, leitura, etc)
    const status = whatsappCloudService.parseWebhookStatus(req.body);
    if (status) {
      await processMessageStatus(status);
    }
  } catch (error) {
    console.error('Erro no webhook WhatsApp:', error);
  }
};

/**
 * Processa mensagem recebida
 */
async function processIncomingMessage(message) {
  try {
    const { from, text, messageId, contactName } = message;

    // Remove código do país para buscar
    const phone = from.replace(/^55/, '');

    console.log(`[WhatsApp] Mensagem de ${contactName || phone}: ${text}`);

    // Marca como lida
    await whatsappCloudService.markAsRead(messageId);

    // Busca o convidado pelo número de telefone
    const guest = await prisma.guest.findFirst({
      where: {
        phone: {
          endsWith: phone.slice(-9) // Últimos 9 dígitos para flexibilidade
        }
      },
      include: {
        party: {
          include: { user: true }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!guest) {
      console.log('[WhatsApp] Convidado não encontrado para:', phone);
      return;
    }

    // Salva a mensagem recebida
    await prisma.message.create({
      data: {
        content: text,
        isFromAI: false,
        guestId: guest.id
      }
    });

    // Cancela follow-ups pendentes para este convidado (já respondeu)
    await prisma.messageQueue.updateMany({
      where: {
        guestId: guest.id,
        status: 'SCHEDULED',
        type: { in: ['FOLLOW_UP_1', 'FOLLOW_UP_2'] }
      },
      data: { status: 'CANCELLED' }
    });

    // Processa com IA
    const partyContext = {
      partyName: guest.party.name,
      partyType: guest.party.partyType,
      partyDate: new Date(guest.party.date).toLocaleDateString('pt-BR'),
      organizerName: guest.party.user.name
    };

    const aiResponse = await claudeService.processGuestResponse(text, partyContext);

    // Atualiza o status do convidado
    await prisma.guest.update({
      where: { id: guest.id },
      data: {
        status: aiResponse.status,
        notes: aiResponse.resumo,
        lastContactAt: new Date()
      }
    });

    // Envia resposta automática (apenas se não confirmou/recusou definitivamente)
    if (aiResponse.resposta && aiResponse.status === 'NECESSITA_CONVERSAR') {
      const sendResult = await whatsappCloudService.sendTextMessage(
        guest.phone,
        aiResponse.resposta
      );

      if (sendResult.success) {
        await prisma.message.create({
          data: {
            content: aiResponse.resposta,
            isFromAI: true,
            guestId: guest.id
          }
        });
      }
    }

    console.log(`[WhatsApp] Processado para ${guest.name}: Status=${aiResponse.status}`);
  } catch (error) {
    console.error('[WhatsApp] Erro ao processar mensagem:', error);
  }
}

/**
 * Processa status de mensagem (entrega, leitura, erro)
 */
async function processMessageStatus(status) {
  try {
    console.log(`[WhatsApp] Status: ${status.status} para mensagem ${status.messageId}`);

    if (status.status === 'failed' && status.error) {
      // Busca a mensagem na fila pelo messageId e marca como falha
      console.error('[WhatsApp] Erro de entrega:', status.error);
    }
  } catch (error) {
    console.error('[WhatsApp] Erro ao processar status:', error);
  }
}

// ============ LEGACY: Evolution API (mantido para compatibilidade) ============

const evolutionService = require('../services/evolution.service');

/**
 * Processa webhooks da Evolution API
 */
exports.handleEvolutionWebhook = async (req, res) => {
  try {
    const { event, data } = req.body;

    console.log('Webhook Evolution recebido:', event);

    res.status(200).json({ received: true });

    if (event === 'messages.upsert' && data?.message) {
      await processEvolutionMessage(data);
    }
  } catch (error) {
    console.error('Erro no webhook Evolution:', error);
    res.status(200).json({ received: true, error: error.message });
  }
};

async function processEvolutionMessage(data) {
  try {
    const { key, message, pushName } = data;
    if (key.fromMe) return;

    const remoteJid = key.remoteJid;
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('55', '');

    const messageContent = message?.conversation ||
      message?.extendedTextMessage?.text ||
      message?.imageMessage?.caption ||
      '';

    if (!messageContent) return;

    // Reutiliza a lógica principal
    await processIncomingMessage({
      from: phone,
      text: messageContent,
      messageId: key.id,
      contactName: pushName
    });
  } catch (error) {
    console.error('Erro ao processar mensagem Evolution:', error);
  }
}
