const { PrismaClient } = require('@prisma/client');
const evolutionService = require('../services/evolution.service');

const prisma = new PrismaClient();

/**
 * Dashboard geral do admin
 * Retorna estatísticas gerais da plataforma
 */
exports.getDashboard = async (req, res) => {
  try {
    // Contadores gerais
    const [
      totalUsers,
      totalParties,
      totalGuests,
      totalMessages,
      recentUsers,
      recentParties,
      guestsByStatus,
      partiesByPlan,
      messagesLastWeek
    ] = await Promise.all([
      // Total de usuários
      prisma.user.count(),

      // Total de festas
      prisma.party.count(),

      // Total de convidados
      prisma.guest.count(),

      // Total de mensagens enviadas
      prisma.message.count(),

      // Usuários recentes (últimos 7 dias)
      prisma.user.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),

      // Festas recentes
      prisma.party.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: {
            select: { name: true, email: true }
          },
          _count: {
            select: { guests: true }
          }
        }
      }),

      // Convidados por status
      prisma.guest.groupBy({
        by: ['status'],
        _count: { status: true }
      }),

      // Festas por plano
      prisma.party.groupBy({
        by: ['plan'],
        _count: { plan: true }
      }),

      // Mensagens nos últimos 7 dias
      prisma.message.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    // Status do WhatsApp
    let whatsappStatus = { status: 'unknown' };
    try {
      whatsappStatus = await evolutionService.getInstanceStatus();
    } catch (e) {
      whatsappStatus = { status: 'error', error: e.message };
    }

    // Formatar estatísticas de convidados
    const guestStats = {
      total: totalGuests,
      byStatus: {}
    };
    guestsByStatus.forEach(item => {
      guestStats.byStatus[item.status] = item._count.status;
    });

    // Formatar estatísticas de planos
    const planStats = {};
    partiesByPlan.forEach(item => {
      planStats[item.plan] = item._count.plan;
    });

    res.json({
      overview: {
        totalUsers,
        totalParties,
        totalGuests,
        totalMessages,
        messagesLastWeek
      },
      guestStats,
      planStats,
      whatsappStatus,
      recentUsers,
      recentParties: recentParties.map(p => ({
        id: p.id,
        name: p.name,
        date: p.date,
        plan: p.plan,
        guestCount: p._count.guests,
        userName: p.user.name,
        userEmail: p.user.email,
        createdAt: p.createdAt
      }))
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard admin:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
  }
};

/**
 * Lista todos os usuários com suas estatísticas
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isAdmin: true,
        createdAt: true,
        _count: {
          select: { parties: true }
        },
        parties: {
          select: {
            id: true,
            name: true,
            plan: true,
            _count: {
              select: { guests: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calcular total de convidados por usuário
    const usersWithStats = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      partyCount: user._count.parties,
      totalGuests: user.parties.reduce((sum, p) => sum + p._count.guests, 0),
      parties: user.parties.map(p => ({
        id: p.id,
        name: p.name,
        plan: p.plan,
        guestCount: p._count.guests
      }))
    }));

    res.json(usersWithStats);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
};

/**
 * Detalhes de um usuário específico
 */
exports.getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isAdmin: true,
        createdAt: true,
        parties: {
          include: {
            _count: {
              select: { guests: true, messages: true }
            },
            guests: {
              select: {
                id: true,
                name: true,
                status: true,
                lastContactAt: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Erro ao buscar detalhes do usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar detalhes do usuário' });
  }
};

/**
 * Lista todas as festas com detalhes
 */
exports.getAllParties = async (req, res) => {
  try {
    const parties = await prisma.party.findMany({
      include: {
        user: {
          select: { name: true, email: true }
        },
        _count: {
          select: { guests: true, messages: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(parties.map(p => ({
      id: p.id,
      name: p.name,
      date: p.date,
      partyType: p.partyType,
      plan: p.plan,
      guestLimit: p.guestLimit,
      messageTemplateStatus: p.messageTemplateStatus,
      guestCount: p._count.guests,
      messageCount: p._count.messages,
      userName: p.user.name,
      userEmail: p.user.email,
      createdAt: p.createdAt
    })));
  } catch (error) {
    console.error('Erro ao listar festas:', error);
    res.status(500).json({ error: 'Erro ao listar festas' });
  }
};

/**
 * Atualiza o status de admin de um usuário
 */
exports.toggleUserAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isAdmin } = req.body;

    // Não pode remover admin de si mesmo
    if (userId === req.user.id && !isAdmin) {
      return res.status(400).json({ error: 'Você não pode remover seu próprio status de admin' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isAdmin },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true
      }
    });

    res.json(user);
  } catch (error) {
    console.error('Erro ao atualizar admin:', error);
    res.status(500).json({ error: 'Erro ao atualizar status de admin' });
  }
};

/**
 * Estatísticas de mensagens
 */
exports.getMessageStats = async (req, res) => {
  try {
    // Mensagens por dia nos últimos 30 dias
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const messages = await prisma.message.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      select: {
        createdAt: true,
        isFromAI: true
      }
    });

    // Agrupar por dia
    const messagesByDay = {};
    messages.forEach(msg => {
      const day = msg.createdAt.toISOString().split('T')[0];
      if (!messagesByDay[day]) {
        messagesByDay[day] = { sent: 0, received: 0 };
      }
      if (msg.isFromAI) {
        messagesByDay[day].sent++;
      } else {
        messagesByDay[day].received++;
      }
    });

    // Fila de mensagens pendentes
    const queueStats = await prisma.messageQueue.groupBy({
      by: ['status'],
      _count: { status: true }
    });

    res.json({
      messagesByDay,
      queueStats: queueStats.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas de mensagens:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};
