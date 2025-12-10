const { PrismaClient } = require('@prisma/client');
const messageTemplateService = require('../services/messageTemplate.service');
const messageSchedulerService = require('../services/messageScheduler.service');
const evolutionService = require('../services/evolution.service');

const prisma = new PrismaClient();

/**
 * Submete mensagem para validação e aprovação
 * POST /api/message-flow/:partyId/submit
 */
exports.submitMessage = async (req, res) => {
  try {
    const { partyId } = req.params;
    const { message } = req.body;

    // Verifica se a festa pertence ao usuário
    const party = await prisma.party.findFirst({
      where: { id: partyId, userId: req.user.id }
    });

    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    // Submete para validação
    const result = await messageTemplateService.submitForReview(partyId, message);

    res.json(result);
  } catch (error) {
    console.error('Erro ao submeter mensagem:', error);
    res.status(500).json({ error: 'Erro ao submeter mensagem para validação' });
  }
};

/**
 * Obtém diretrizes de aprovação
 * GET /api/message-flow/guidelines
 */
exports.getGuidelines = async (req, res) => {
  const guidelines = messageTemplateService.getApprovalGuidelines();
  res.json(guidelines);
};

/**
 * Valida mensagem sem salvar (preview)
 * POST /api/message-flow/validate
 */
exports.validateMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const result = messageTemplateService.validateMessage(message);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao validar mensagem' });
  }
};

/**
 * Obtém status do template da festa
 * GET /api/message-flow/:partyId/status
 */
exports.getTemplateStatus = async (req, res) => {
  try {
    const { partyId } = req.params;

    const party = await prisma.party.findFirst({
      where: { id: partyId, userId: req.user.id },
      select: {
        inviteMessage: true,
        messageTemplateStatus: true,
        validationErrors: true,
        firstInviteSentAt: true
      }
    });

    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    const canSend = await messageTemplateService.canSendMessages(partyId);

    res.json({
      message: party.inviteMessage,
      status: party.messageTemplateStatus,
      errors: party.validationErrors ? JSON.parse(party.validationErrors) : [],
      canSendTest: canSend.canSend,
      canSendAll: canSend.canSend,
      firstInviteSentAt: party.firstInviteSentAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter status' });
  }
};

/**
 * Envia mensagem de teste para o usuário
 * POST /api/message-flow/:partyId/test
 */
exports.sendTestMessage = async (req, res) => {
  try {
    const { partyId } = req.params;

    const party = await prisma.party.findFirst({
      where: { id: partyId, userId: req.user.id },
      include: {
        user: { select: { phone: true, name: true } }
      }
    });

    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    // Verificar se pode enviar
    const canSend = await messageTemplateService.canSendMessages(partyId);
    if (!canSend.canSend) {
      return res.status(400).json({
        error: canSend.reason,
        status: canSend.status,
        guidelines: messageTemplateService.getApprovalGuidelines()
      });
    }

    if (!party.user.phone) {
      return res.status(400).json({
        error: 'Você precisa cadastrar seu telefone no perfil para testar'
      });
    }

    // Personaliza a mensagem com nome do usuário
    const testMessage = party.inviteMessage.replace('{nome_convidado}', party.user.name);

    // Envia via Evolution API
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
    console.error('Erro ao enviar teste:', error);
    res.status(500).json({ error: 'Erro ao enviar mensagem de teste' });
  }
};

/**
 * Agenda envio de convites para todos os convidados
 * POST /api/message-flow/:partyId/send-all
 */
exports.sendToAllGuests = async (req, res) => {
  try {
    const { partyId } = req.params;
    const { scheduleFor } = req.body; // Data opcional para agendar

    const party = await prisma.party.findFirst({
      where: { id: partyId, userId: req.user.id },
      include: {
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

    // Verificar se pode enviar
    const canSend = await messageTemplateService.canSendMessages(partyId);
    if (!canSend.canSend) {
      return res.status(400).json({
        error: canSend.reason,
        status: canSend.status,
        guidelines: messageTemplateService.getApprovalGuidelines()
      });
    }

    const scheduledDate = scheduleFor ? new Date(scheduleFor) : new Date();
    const result = await messageSchedulerService.scheduleInvites(partyId, scheduledDate);

    // Agenda também os follow-ups se existirem
    const followUpResult = await messageSchedulerService.scheduleFollowUps(partyId);

    res.json({
      success: true,
      invites: result,
      followUps: followUpResult,
      message: `${result.scheduled} convites e ${followUpResult.scheduled} follow-ups agendados!`
    });
  } catch (error) {
    console.error('Erro ao agendar envios:', error);
    res.status(500).json({ error: error.message || 'Erro ao agendar envio' });
  }
};

/**
 * Obtém estatísticas da fila de mensagens
 * GET /api/message-flow/:partyId/queue-stats
 */
exports.getQueueStats = async (req, res) => {
  try {
    const { partyId } = req.params;

    const party = await prisma.party.findFirst({
      where: { id: partyId, userId: req.user.id }
    });

    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    const stats = await messageSchedulerService.getQueueStats(partyId);
    const upcoming = await messageSchedulerService.getUpcomingMessages(partyId, 5);

    res.json({
      stats,
      upcoming: upcoming.map(m => ({
        id: m.id,
        type: m.type,
        guestName: m.guest.name,
        scheduledFor: m.scheduledFor,
        status: m.status
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter estatísticas' });
  }
};

/**
 * Cancela mensagens pendentes
 * POST /api/message-flow/:partyId/cancel
 */
exports.cancelPendingMessages = async (req, res) => {
  try {
    const { partyId } = req.params;

    const party = await prisma.party.findFirst({
      where: { id: partyId, userId: req.user.id }
    });

    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    const result = await messageSchedulerService.cancelPendingMessages(partyId);

    res.json({
      success: true,
      message: `${result.cancelled} mensagens canceladas`
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao cancelar mensagens' });
  }
};

/**
 * Processa fila de mensagens (chamado por cron job)
 * POST /api/message-flow/process-queue
 * Requer header: X-Cron-Secret
 */
exports.processQueue = async (req, res) => {
  try {
    const cronSecret = req.headers['x-cron-secret'];

    if (cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const result = await messageSchedulerService.processMessageQueue();

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Erro ao processar fila:', error);
    res.status(500).json({ error: 'Erro ao processar fila' });
  }
};

/**
 * Obtém resumo do fluxo de mensagens da festa
 * GET /api/message-flow/:partyId/summary
 */
exports.getSummary = async (req, res) => {
  try {
    const { partyId } = req.params;

    const party = await prisma.party.findFirst({
      where: { id: partyId, userId: req.user.id },
      include: {
        guests: true,
        followUps: true,
        _count: {
          select: { messageQueue: true }
        }
      }
    });

    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    const guestStats = {
      total: party.guests.length,
      contacted: party.guests.filter(g => g.firstContactAt).length,
      confirmed: party.guests.filter(g => g.status === 'CONFIRMOU_PRESENCA').length,
      refused: party.guests.filter(g => g.status === 'RECUSOU_CONVITE').length,
      pending: party.guests.filter(g => g.status === 'NAO_RESPONDEU').length,
      needsConversation: party.guests.filter(g => g.status === 'NECESSITA_CONVERSAR').length,
      withErrors: party.guests.filter(g => g.sendError).length
    };

    const canSend = await messageTemplateService.canSendMessages(partyId);

    res.json({
      templateStatus: party.messageTemplateStatus,
      canSend: canSend.canSend,
      canSendReason: canSend.reason,
      firstInviteSentAt: party.firstInviteSentAt,
      followUps: party.followUps.map(f => ({
        order: f.order,
        scheduleType: f.scheduleType,
        status: f.status,
        daysOffset: f.daysOffset
      })),
      guestStats,
      queueSize: party._count.messageQueue
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter resumo' });
  }
};
