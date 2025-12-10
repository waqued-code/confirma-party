const { PrismaClient } = require('@prisma/client');
const evolutionService = require('./evolution.service');

const prisma = new PrismaClient();

/**
 * Agenda convites iniciais para todos os convidados de uma festa
 * @param {string} partyId - ID da festa
 * @param {Date} scheduledFor - Data/hora para envio (opcional, default: agora)
 */
exports.scheduleInvites = async (partyId, scheduledFor = new Date()) => {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: {
      guests: {
        where: {
          status: 'NAO_RESPONDEU',
          firstContactAt: null // Apenas quem nunca foi contatado
        }
      }
    }
  });

  if (!party) {
    throw new Error('Festa não encontrada');
  }

  if (party.messageTemplateStatus !== 'APPROVED') {
    throw new Error('A mensagem precisa ser aprovada antes do envio');
  }

  if (!party.inviteMessage) {
    throw new Error('Nenhuma mensagem de convite cadastrada');
  }

  if (party.guests.length === 0) {
    return { scheduled: 0, message: 'Não há convidados pendentes para enviar' };
  }

  // Criar entrada na fila para cada convidado
  const queueItems = party.guests.map((guest, index) => ({
    type: 'INVITE',
    content: party.inviteMessage.replace('{nome_convidado}', guest.name),
    scheduledFor: new Date(scheduledFor.getTime() + (index * 3000)), // 3 segundos entre cada
    status: 'SCHEDULED',
    guestId: guest.id,
    partyId: party.id
  }));

  await prisma.messageQueue.createMany({
    data: queueItems,
    skipDuplicates: true
  });

  // Registrar data do primeiro envio da festa
  if (!party.firstInviteSentAt) {
    await prisma.party.update({
      where: { id: partyId },
      data: { firstInviteSentAt: scheduledFor }
    });
  }

  return {
    scheduled: queueItems.length,
    message: `${queueItems.length} convites agendados para envio`
  };
};

/**
 * Agenda follow-ups para os convidados que não responderam
 * @param {string} partyId - ID da festa
 */
exports.scheduleFollowUps = async (partyId) => {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: {
      followUps: true,
      guests: {
        where: {
          status: 'NAO_RESPONDEU',
          firstContactAt: { not: null } // Apenas quem já foi contatado
        }
      }
    }
  });

  if (!party) {
    throw new Error('Festa não encontrada');
  }

  let totalScheduled = 0;

  for (const followUp of party.followUps) {
    if (followUp.status !== 'PENDING') continue;

    // Calcular data de envio do follow-up
    const sendDate = calculateFollowUpDate(followUp, party);

    if (!sendDate || sendDate < new Date()) {
      continue; // Pular se a data já passou
    }

    // Filtrar convidados que ainda não receberam este follow-up
    const eligibleGuests = party.guests.filter(guest => {
      if (followUp.order === 1 && guest.followUp1SentAt) return false;
      if (followUp.order === 2 && guest.followUp2SentAt) return false;
      return true;
    });

    // Criar entradas na fila
    const queueItems = eligibleGuests.map((guest, index) => ({
      type: followUp.order === 1 ? 'FOLLOW_UP_1' : 'FOLLOW_UP_2',
      content: followUp.message.replace('{nome_convidado}', guest.name),
      scheduledFor: new Date(sendDate.getTime() + (index * 3000)),
      status: 'SCHEDULED',
      guestId: guest.id,
      partyId: party.id
    }));

    if (queueItems.length > 0) {
      await prisma.messageQueue.createMany({
        data: queueItems,
        skipDuplicates: true
      });
      totalScheduled += queueItems.length;
    }
  }

  return {
    scheduled: totalScheduled,
    message: `${totalScheduled} follow-ups agendados`
  };
};

/**
 * Calcula a data de envio de um follow-up
 */
function calculateFollowUpDate(followUp, party) {
  switch (followUp.scheduleType) {
    case 'SPECIFIC_DATE':
      return followUp.scheduledDate;

    case 'DAYS_BEFORE_PARTY':
      const partyDate = new Date(party.date);
      partyDate.setDate(partyDate.getDate() - followUp.daysOffset);
      partyDate.setHours(10, 0, 0, 0); // 10h da manhã
      return partyDate;

    case 'DAYS_AFTER_INVITE':
      if (!party.firstInviteSentAt) return null;
      const inviteDate = new Date(party.firstInviteSentAt);
      inviteDate.setDate(inviteDate.getDate() + followUp.daysOffset);
      inviteDate.setHours(10, 0, 0, 0);
      return inviteDate;

    default:
      return null;
  }
}

/**
 * Processa a fila de mensagens pendentes
 * Este método deve ser chamado periodicamente (cron job)
 */
exports.processMessageQueue = async () => {
  const now = new Date();

  // Buscar mensagens pendentes que devem ser enviadas
  const pendingMessages = await prisma.messageQueue.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledFor: { lte: now }
    },
    include: {
      guest: true,
      party: true
    },
    orderBy: { scheduledFor: 'asc' },
    take: 50 // Processar em lotes de 50
  });

  const results = {
    processed: 0,
    success: 0,
    failed: 0,
    errors: []
  };

  for (const queueItem of pendingMessages) {
    results.processed++;

    try {
      // Marcar como enviando
      await prisma.messageQueue.update({
        where: { id: queueItem.id },
        data: { status: 'SENDING', attempts: queueItem.attempts + 1 }
      });

      // Enviar via Evolution API
      const sendResult = await evolutionService.sendTextMessage(
        queueItem.guest.phone,
        queueItem.content
      );

      if (sendResult.success) {
        // Sucesso - atualizar fila e convidado
        await prisma.$transaction([
          prisma.messageQueue.update({
            where: { id: queueItem.id },
            data: { status: 'SENT', sentAt: new Date() }
          }),
          prisma.guest.update({
            where: { id: queueItem.guestId },
            data: {
              lastContactAt: new Date(),
              sendError: null,
              ...(queueItem.type === 'INVITE' && { firstContactAt: new Date() }),
              ...(queueItem.type === 'FOLLOW_UP_1' && { followUp1SentAt: new Date() }),
              ...(queueItem.type === 'FOLLOW_UP_2' && { followUp2SentAt: new Date() })
            }
          }),
          prisma.message.create({
            data: {
              content: queueItem.content,
              isFromAI: true,
              guestId: queueItem.guestId
            }
          })
        ]);

        results.success++;
      } else {
        throw new Error(sendResult.error || 'Erro desconhecido no envio');
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        guestId: queueItem.guestId,
        error: error.message
      });

      // Se falhou mais de 3 vezes, marca como falha definitiva
      const newStatus = queueItem.attempts >= 2 ? 'FAILED' : 'SCHEDULED';

      await prisma.$transaction([
        prisma.messageQueue.update({
          where: { id: queueItem.id },
          data: {
            status: newStatus,
            lastError: error.message,
            // Reagendar para 5 minutos depois se ainda pode tentar
            ...(newStatus === 'SCHEDULED' && {
              scheduledFor: new Date(Date.now() + 5 * 60 * 1000)
            })
          }
        }),
        prisma.guest.update({
          where: { id: queueItem.guestId },
          data: { sendError: error.message }
        })
      ]);
    }

    // Aguardar 2 segundos entre envios para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
};

/**
 * Cancela todas as mensagens pendentes de uma festa
 */
exports.cancelPendingMessages = async (partyId) => {
  const result = await prisma.messageQueue.updateMany({
    where: {
      partyId,
      status: { in: ['SCHEDULED', 'SENDING'] }
    },
    data: { status: 'CANCELLED' }
  });

  return { cancelled: result.count };
};

/**
 * Obtém estatísticas da fila de mensagens de uma festa
 */
exports.getQueueStats = async (partyId) => {
  const stats = await prisma.messageQueue.groupBy({
    by: ['status', 'type'],
    where: { partyId },
    _count: true
  });

  return stats.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = {};
    acc[item.type][item.status] = item._count;
    return acc;
  }, {});
};

/**
 * Obtém próximos envios agendados
 */
exports.getUpcomingMessages = async (partyId, limit = 10) => {
  return prisma.messageQueue.findMany({
    where: {
      partyId,
      status: 'SCHEDULED'
    },
    include: {
      guest: { select: { name: true, phone: true } }
    },
    orderBy: { scheduledFor: 'asc' },
    take: limit
  });
};
