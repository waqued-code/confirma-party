const { PrismaClient } = require('@prisma/client');
const claudeService = require('../services/claude.service');

const prisma = new PrismaClient();

exports.generateInviteMessage = async (req, res) => {
  try {
    const { partyId } = req.params;

    const party = await prisma.party.findFirst({
      where: { id: partyId, userId: req.user.id }
    });

    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    const message = await claudeService.generateInviteMessage(party);

    // Salva a mensagem na festa
    await prisma.party.update({
      where: { id: partyId },
      data: { inviteMessage: message }
    });

    res.json({
      message: 'Mensagem gerada com sucesso',
      inviteMessage: message
    });
  } catch (error) {
    console.error('Erro ao gerar mensagem:', error);
    res.status(500).json({ error: 'Erro ao gerar mensagem de convite' });
  }
};

exports.regenerateInviteMessage = async (req, res) => {
  try {
    const { partyId } = req.params;
    const { instructions } = req.body;

    const party = await prisma.party.findFirst({
      where: { id: partyId, userId: req.user.id }
    });

    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    // Modifica o party para incluir instruções adicionais
    const partyWithInstructions = {
      ...party,
      observations: party.observations
        ? `${party.observations}\n\nInstruções adicionais: ${instructions}`
        : `Instruções adicionais: ${instructions}`
    };

    const message = await claudeService.generateInviteMessage(partyWithInstructions);

    await prisma.party.update({
      where: { id: partyId },
      data: { inviteMessage: message }
    });

    res.json({
      message: 'Mensagem regenerada com sucesso',
      inviteMessage: message
    });
  } catch (error) {
    console.error('Erro ao regenerar mensagem:', error);
    res.status(500).json({ error: 'Erro ao regenerar mensagem de convite' });
  }
};

exports.processGuestResponse = async (req, res) => {
  try {
    const { guestId } = req.params;
    const { message } = req.body;

    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: {
        party: {
          include: { user: { select: { name: true } } }
        }
      }
    });

    if (!guest || guest.party.userId !== req.user.id) {
      return res.status(404).json({ error: 'Convidado não encontrado' });
    }

    const partyContext = {
      partyName: guest.party.name,
      partyType: guest.party.partyType,
      partyDate: new Date(guest.party.date).toLocaleDateString('pt-BR')
    };

    const aiResponse = await claudeService.processGuestResponse(message, partyContext);

    // Salva a mensagem do convidado
    await prisma.message.create({
      data: {
        content: message,
        isFromAI: false,
        guestId
      }
    });

    // Atualiza o status do convidado se necessário
    if (aiResponse.status !== 'NAO_RESPONDEU') {
      await prisma.guest.update({
        where: { id: guestId },
        data: {
          status: aiResponse.status,
          notes: aiResponse.resumo,
          lastContactAt: new Date()
        }
      });
    }

    res.json({
      status: aiResponse.status,
      suggestedResponse: aiResponse.resposta,
      summary: aiResponse.resumo
    });
  } catch (error) {
    console.error('Erro ao processar resposta:', error);
    res.status(500).json({ error: 'Erro ao processar resposta do convidado' });
  }
};
