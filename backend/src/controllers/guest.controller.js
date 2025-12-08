const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.create = async (req, res) => {
  try {
    const { partyId, name, phone, contactMethod } = req.body;

    const party = await prisma.party.findFirst({
      where: { id: partyId, userId: req.user.id },
      include: {
        _count: { select: { guests: true } }
      }
    });

    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    // Verificar limite do plano
    const currentGuestCount = party._count.guests;
    if (currentGuestCount >= party.guestLimit) {
      return res.status(403).json({
        error: 'PLAN_LIMIT_REACHED',
        message: 'Limite de convidados atingido',
        currentPlan: party.plan,
        guestLimit: party.guestLimit,
        currentCount: currentGuestCount
      });
    }

    const guest = await prisma.guest.create({
      data: {
        name,
        phone: phone.replace(/\D/g, ''),
        contactMethod: contactMethod || 'WHATSAPP',
        partyId
      }
    });

    res.status(201).json({
      message: 'Convidado adicionado com sucesso',
      guest,
      guestCount: currentGuestCount + 1,
      guestLimit: party.guestLimit
    });
  } catch (error) {
    console.error('Erro ao criar convidado:', error);
    res.status(500).json({ error: 'Erro ao adicionar convidado' });
  }
};

exports.getByParty = async (req, res) => {
  try {
    const { partyId } = req.params;
    const { status } = req.query;

    const party = await prisma.party.findFirst({
      where: { id: partyId, userId: req.user.id }
    });

    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    const where = { partyId };
    if (status) {
      where.status = status;
    }

    const guests = await prisma.guest.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    res.json(guests);
  } catch (error) {
    console.error('Erro ao buscar convidados:', error);
    res.status(500).json({ error: 'Erro ao buscar convidados' });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const guest = await prisma.guest.findUnique({
      where: { id },
      include: {
        party: {
          select: { userId: true, name: true }
        },
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!guest || guest.party.userId !== req.user.id) {
      return res.status(404).json({ error: 'Convidado não encontrado' });
    }

    res.json(guest);
  } catch (error) {
    console.error('Erro ao buscar convidado:', error);
    res.status(500).json({ error: 'Erro ao buscar convidado' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, contactMethod, status, notes } = req.body;

    const guest = await prisma.guest.findUnique({
      where: { id },
      include: { party: { select: { userId: true } } }
    });

    if (!guest || guest.party.userId !== req.user.id) {
      return res.status(404).json({ error: 'Convidado não encontrado' });
    }

    const updatedGuest = await prisma.guest.update({
      where: { id },
      data: {
        name,
        phone: phone ? phone.replace(/\D/g, '') : undefined,
        contactMethod,
        status,
        notes
      }
    });

    res.json({
      message: 'Convidado atualizado com sucesso',
      guest: updatedGuest
    });
  } catch (error) {
    console.error('Erro ao atualizar convidado:', error);
    res.status(500).json({ error: 'Erro ao atualizar convidado' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['NAO_RESPONDEU', 'CONFIRMOU_PRESENCA', 'RECUSOU_CONVITE', 'NECESSITA_CONVERSAR'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const guest = await prisma.guest.findUnique({
      where: { id },
      include: { party: { select: { userId: true } } }
    });

    if (!guest || guest.party.userId !== req.user.id) {
      return res.status(404).json({ error: 'Convidado não encontrado' });
    }

    const updatedGuest = await prisma.guest.update({
      where: { id },
      data: { status }
    });

    res.json({
      message: 'Status atualizado com sucesso',
      guest: updatedGuest
    });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const guest = await prisma.guest.findUnique({
      where: { id },
      include: { party: { select: { userId: true } } }
    });

    if (!guest || guest.party.userId !== req.user.id) {
      return res.status(404).json({ error: 'Convidado não encontrado' });
    }

    await prisma.guest.delete({
      where: { id }
    });

    res.json({ message: 'Convidado excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir convidado:', error);
    res.status(500).json({ error: 'Erro ao excluir convidado' });
  }
};

exports.bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs não fornecidos' });
    }

    // Verify all guests belong to user's parties
    const guests = await prisma.guest.findMany({
      where: { id: { in: ids } },
      include: { party: { select: { userId: true } } }
    });

    const allBelongToUser = guests.every(g => g.party.userId === req.user.id);
    if (!allBelongToUser) {
      return res.status(403).json({ error: 'Permissão negada' });
    }

    await prisma.guest.deleteMany({
      where: { id: { in: ids } }
    });

    res.json({ message: `${ids.length} convidados excluídos com sucesso` });
  } catch (error) {
    console.error('Erro ao excluir convidados:', error);
    res.status(500).json({ error: 'Erro ao excluir convidados' });
  }
};
