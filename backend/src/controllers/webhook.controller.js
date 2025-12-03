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

    console.log('Webhook recebido:', event, JSON.stringify(data, null, 2));

    // Responde imediatamente para não timeout
    res.status(200).json({ received: true });

    // Processa apenas mensagens recebidas
    if (event === 'messages.upsert' && data?.message) {
      await processIncomingMessage(data);
    }
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(200).json({ received: true, error: error.message });
  }
};

async function processIncomingMessage(data) {
  try {
    const { key, message, pushName } = data;

    // Ignora mensagens enviadas por nós
    if (key.fromMe) return;

    // Extrai o número do remetente
    const remoteJid = key.remoteJid;
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('55', '');

    // Extrai o conteúdo da mensagem
    const messageContent = message?.conversation ||
      message?.extendedTextMessage?.text ||
      message?.imageMessage?.caption ||
      '';

    if (!messageContent) return;

    console.log(`Mensagem de ${phone}: ${messageContent}`);

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
      console.log('Convidado não encontrado para o número:', phone);
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

    // Envia resposta automática
    if (aiResponse.resposta) {
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

    console.log(`Resposta processada para ${guest.name}: Status=${aiResponse.status}`);
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
  }
}
