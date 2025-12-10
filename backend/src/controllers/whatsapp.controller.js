const { PrismaClient } = require('@prisma/client');
const evolutionService = require('../services/evolution.service');

const prisma = new PrismaClient();

exports.getStatus = async (req, res) => {
  try {
    const status = await evolutionService.getInstanceStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.connect = async (req, res) => {
  try {
    const qrCode = await evolutionService.getQRCode();
    res.json(qrCode);
  } catch (error) {
    // Se a instância não existe, tenta criar
    if (error.message.includes('not found') || error.response?.status === 404) {
      try {
        const instance = await evolutionService.createInstance();
        res.json(instance);
      } catch (createError) {
        res.status(500).json({ error: createError.message });
      }
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

exports.disconnect = async (req, res) => {
  try {
    const result = await evolutionService.logout();
    res.json({ message: 'Desconectado com sucesso', result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.resetConnection = async (req, res) => {
  try {
    const result = await evolutionService.resetConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.setWebhook = async (req, res) => {
  try {
    const { webhookUrl } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({ error: 'URL do webhook é obrigatória' });
    }

    const result = await evolutionService.setWebhook(webhookUrl);
    res.json({ message: 'Webhook configurado com sucesso', result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.sendToGuest = async (req, res) => {
  try {
    const { guestId } = req.params;
    const { message } = req.body;

    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: { party: { select: { userId: true } } }
    });

    if (!guest || guest.party.userId !== req.user.id) {
      return res.status(404).json({ error: 'Convidado não encontrado' });
    }

    const result = await evolutionService.sendTextMessage(guest.phone, message);

    if (result.success) {
      // Salva a mensagem enviada
      await prisma.message.create({
        data: {
          content: message,
          isFromAI: true,
          guestId
        }
      });

      await prisma.guest.update({
        where: { id: guestId },
        data: { lastContactAt: new Date() }
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
};

// Enviar mensagem de teste para o telefone do usuário
exports.sendTestMessage = async (req, res) => {
  try {
    const { partyId } = req.params;

    // Buscar festa e usuário
    const party = await prisma.party.findFirst({
      where: { id: partyId, userId: req.user.id },
      include: {
        user: {
          select: { phone: true, name: true }
        }
      }
    });

    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    if (!party.inviteMessage) {
      return res.status(400).json({ error: 'Gere uma mensagem de convite primeiro' });
    }

    if (!party.user.phone) {
      return res.status(400).json({ error: 'Você precisa ter um telefone cadastrado no seu perfil para testar' });
    }

    // Substituir placeholder pelo nome do usuário
    const testMessage = party.inviteMessage.replace('{nome_convidado}', party.user.name || 'Convidado');

    // Enviar mensagem de teste
    const result = await evolutionService.sendTextMessage(party.user.phone, testMessage);

    if (result.success) {
      res.json({
        success: true,
        message: 'Mensagem de teste enviada para seu WhatsApp!',
        phone: party.user.phone
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Falha ao enviar mensagem de teste',
        details: result.error
      });
    }
  } catch (error) {
    console.error('Erro ao enviar mensagem de teste:', error);
    res.status(500).json({ error: 'Erro ao enviar mensagem de teste' });
  }
};

exports.sendToAllGuests = async (req, res) => {
  try {
    const { partyId } = req.params;

    const party = await prisma.party.findFirst({
      where: { id: partyId, userId: req.user.id },
      include: {
        guests: {
          where: { status: 'NAO_RESPONDEU' }
        },
        _count: { select: { guests: true } }
      }
    });

    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    // Verificar limite do plano antes de enviar
    const currentGuestCount = party._count.guests;
    if (currentGuestCount > party.guestLimit) {
      return res.status(403).json({
        error: 'PLAN_LIMIT_EXCEEDED',
        message: `Você tem ${currentGuestCount} convidados, mas seu plano permite apenas ${party.guestLimit}. Faça upgrade para enviar mensagens.`,
        currentPlan: party.plan,
        guestLimit: party.guestLimit,
        currentCount: currentGuestCount
      });
    }

    if (!party.inviteMessage) {
      return res.status(400).json({ error: 'Gere uma mensagem de convite primeiro' });
    }

    if (party.guests.length === 0) {
      return res.status(400).json({ error: 'Não há convidados pendentes para contatar' });
    }

    const results = await evolutionService.sendBulkMessages(party.guests, party.inviteMessage);

    // Salva as mensagens enviadas com sucesso
    for (const result of results) {
      if (result.success) {
        await prisma.message.create({
          data: {
            content: party.inviteMessage.replace('{nome_convidado}', result.guestName),
            isFromAI: true,
            guestId: result.guestId
          }
        });

        await prisma.guest.update({
          where: { id: result.guestId },
          data: { lastContactAt: new Date() }
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      message: `Enviado para ${successCount} convidados. ${failCount} falhas.`,
      results
    });
  } catch (error) {
    console.error('Erro ao enviar mensagens:', error);
    res.status(500).json({ error: 'Erro ao enviar mensagens' });
  }
};
