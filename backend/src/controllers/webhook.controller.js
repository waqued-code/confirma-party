const { PrismaClient } = require('@prisma/client');
const claudeService = require('../services/claude.service');
const evolutionService = require('../services/evolution.service');

const prisma = new PrismaClient();

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

    if (event === 'connection.update') {
      console.log('Status da conexão:', data?.state);
    }
  } catch (error) {
    console.error('Erro no webhook Evolution:', error);
    res.status(200).json({ received: true, error: error.message });
  }
};

/**
 * Processa mensagem recebida diretamente (modo local)
 */
exports.processEvolutionMessageDirect = async (data) => {
  return processEvolutionMessage(data);
};

/**
 * Processa mensagem recebida da Evolution API
 */
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

    console.log(`[Evolution] Mensagem de ${pushName || phone}: ${messageContent}`);

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
      console.log('[Evolution] Convidado não encontrado para:', phone);
      return;
    }

    // Salva a mensagem recebida
    await prisma.message.create({
      data: {
        content: messageContent,
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

    const aiResponse = await claudeService.processGuestResponse(messageContent, partyContext);

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
      const sendResult = await evolutionService.sendTextMessage(
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

    console.log(`[Evolution] Processado para ${guest.name}: Status=${aiResponse.status}`);
  } catch (error) {
    console.error('[Evolution] Erro ao processar mensagem:', error);
  }
}
