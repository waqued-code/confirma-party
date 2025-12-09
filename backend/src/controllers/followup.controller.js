const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Listar follow-ups de uma festa
exports.getByParty = async (req, res) => {
  try {
    const { partyId } = req.params;

    // Verifica se a festa pertence ao usuário
    const party = await prisma.party.findFirst({
      where: { id: partyId, userId: req.user.id }
    });

    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    const followUps = await prisma.followUp.findMany({
      where: { partyId },
      orderBy: { order: 'asc' }
    });

    res.json(followUps);
  } catch (error) {
    console.error('Erro ao buscar follow-ups:', error);
    res.status(500).json({ error: 'Erro ao buscar follow-ups' });
  }
};

// Criar ou atualizar follow-up
exports.upsert = async (req, res) => {
  try {
    const { partyId } = req.params;
    const { order, message, scheduleType, scheduledDate, daysOffset } = req.body;

    // Validações
    if (!order || order < 1 || order > 2) {
      return res.status(400).json({ error: 'Ordem deve ser 1 ou 2' });
    }

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    if (!scheduleType) {
      return res.status(400).json({ error: 'Tipo de agendamento é obrigatório' });
    }

    // Validação específica por tipo
    if (scheduleType === 'SPECIFIC_DATE' && !scheduledDate) {
      return res.status(400).json({ error: 'Data específica é obrigatória para este tipo de agendamento' });
    }

    if ((scheduleType === 'DAYS_BEFORE_PARTY' || scheduleType === 'DAYS_AFTER_INVITE') &&
        (daysOffset === undefined || daysOffset === null || daysOffset < 1)) {
      return res.status(400).json({ error: 'Número de dias é obrigatório e deve ser maior que 0' });
    }

    // Verifica se a festa pertence ao usuário
    const party = await prisma.party.findFirst({
      where: { id: partyId, userId: req.user.id }
    });

    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    // Upsert (cria ou atualiza)
    const followUp = await prisma.followUp.upsert({
      where: {
        partyId_order: { partyId, order }
      },
      update: {
        message: message.trim(),
        scheduleType,
        scheduledDate: scheduleType === 'SPECIFIC_DATE' ? new Date(scheduledDate) : null,
        daysOffset: scheduleType !== 'SPECIFIC_DATE' ? parseInt(daysOffset) : null,
        status: 'PENDING' // Reset status quando atualiza
      },
      create: {
        partyId,
        order,
        message: message.trim(),
        scheduleType,
        scheduledDate: scheduleType === 'SPECIFIC_DATE' ? new Date(scheduledDate) : null,
        daysOffset: scheduleType !== 'SPECIFIC_DATE' ? parseInt(daysOffset) : null
      }
    });

    res.json(followUp);
  } catch (error) {
    console.error('Erro ao salvar follow-up:', error);
    res.status(500).json({ error: 'Erro ao salvar follow-up' });
  }
};

// Deletar follow-up
exports.delete = async (req, res) => {
  try {
    const { partyId, order } = req.params;

    // Verifica se a festa pertence ao usuário
    const party = await prisma.party.findFirst({
      where: { id: partyId, userId: req.user.id }
    });

    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    await prisma.followUp.delete({
      where: {
        partyId_order: { partyId, order: parseInt(order) }
      }
    });

    res.json({ message: 'Follow-up removido com sucesso' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Follow-up não encontrado' });
    }
    console.error('Erro ao deletar follow-up:', error);
    res.status(500).json({ error: 'Erro ao deletar follow-up' });
  }
};

// Calcular data de envio do follow-up
exports.getScheduledDate = (followUp, party) => {
  switch (followUp.scheduleType) {
    case 'SPECIFIC_DATE':
      return followUp.scheduledDate;

    case 'DAYS_BEFORE_PARTY':
      const partyDate = new Date(party.date);
      partyDate.setDate(partyDate.getDate() - followUp.daysOffset);
      return partyDate;

    case 'DAYS_AFTER_INVITE':
      const contactDate = new Date(party.contactDate);
      contactDate.setDate(contactDate.getDate() + followUp.daysOffset);
      return contactDate;

    default:
      return null;
  }
};
