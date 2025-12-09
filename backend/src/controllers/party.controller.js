const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');

const prisma = new PrismaClient();

exports.create = async (req, res) => {
  try {
    const { name, date, contactDate, partyType, observations } = req.body;

    if (!name || !date || !contactDate || !partyType) {
      return res.status(400).json({
        error: 'Nome, data, data de contato e tipo da festa são obrigatórios'
      });
    }

    const party = await prisma.party.create({
      data: {
        name,
        date: new Date(date),
        contactDate: new Date(contactDate),
        partyType,
        observations,
        userId: req.user.id
      }
    });

    res.status(201).json({
      message: 'Festa criada com sucesso',
      party
    });
  } catch (error) {
    console.error('Erro ao criar festa:', error);
    res.status(500).json({ error: 'Erro ao criar festa' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const parties = await prisma.party.findMany({
      where: { userId: req.user.id },
      include: {
        _count: {
          select: { guests: true }
        },
        guests: {
          select: { status: true }
        }
      },
      orderBy: { date: 'asc' }
    });

    const partiesWithStats = parties.map(party => {
      const stats = {
        total: party.guests.length,
        confirmados: party.guests.filter(g => g.status === 'CONFIRMOU_PRESENCA').length,
        recusados: party.guests.filter(g => g.status === 'RECUSOU_CONVITE').length,
        pendentes: party.guests.filter(g => g.status === 'NAO_RESPONDEU').length,
        necessitaConversar: party.guests.filter(g => g.status === 'NECESSITA_CONVERSAR').length
      };

      const { guests, _count, ...partyData } = party;
      return { ...partyData, stats };
    });

    res.json(partiesWithStats);
  } catch (error) {
    console.error('Erro ao buscar festas:', error);
    res.status(500).json({ error: 'Erro ao buscar festas' });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const party = await prisma.party.findFirst({
      where: {
        id,
        userId: req.user.id
      },
      include: {
        guests: {
          orderBy: { name: 'asc' }
        },
        followUps: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    const stats = {
      total: party.guests.length,
      confirmados: party.guests.filter(g => g.status === 'CONFIRMOU_PRESENCA').length,
      recusados: party.guests.filter(g => g.status === 'RECUSOU_CONVITE').length,
      pendentes: party.guests.filter(g => g.status === 'NAO_RESPONDEU').length,
      necessitaConversar: party.guests.filter(g => g.status === 'NECESSITA_CONVERSAR').length
    };

    const planInfo = {
      plan: party.plan,
      guestLimit: party.guestLimit,
      guestCount: party.guests.length,
      availableSlots: party.guestLimit - party.guests.length
    };

    res.json({ ...party, stats, planInfo });
  } catch (error) {
    console.error('Erro ao buscar festa:', error);
    res.status(500).json({ error: 'Erro ao buscar festa' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, contactDate, partyType, observations, inviteMessage } = req.body;

    const existingParty = await prisma.party.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!existingParty) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    const party = await prisma.party.update({
      where: { id },
      data: {
        name,
        date: date ? new Date(date) : undefined,
        contactDate: contactDate ? new Date(contactDate) : undefined,
        partyType,
        observations,
        inviteMessage
      }
    });

    res.json({
      message: 'Festa atualizada com sucesso',
      party
    });
  } catch (error) {
    console.error('Erro ao atualizar festa:', error);
    res.status(500).json({ error: 'Erro ao atualizar festa' });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const existingParty = await prisma.party.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!existingParty) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    await prisma.party.delete({
      where: { id }
    });

    res.json({ message: 'Festa excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir festa:', error);
    res.status(500).json({ error: 'Erro ao excluir festa' });
  }
};

exports.uploadGuests = async (req, res) => {
  try {
    const { id } = req.params;

    const party = await prisma.party.findFirst({
      where: { id, userId: req.user.id },
      include: {
        _count: { select: { guests: true } }
      }
    });

    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo não fornecido' });
    }

    // Verificar limite do plano
    const currentGuestCount = party._count.guests;
    const availableSlots = party.guestLimit - currentGuestCount;

    if (availableSlots <= 0) {
      return res.status(403).json({
        error: 'PLAN_LIMIT_REACHED',
        message: 'Limite de convidados atingido',
        currentPlan: party.plan,
        guestLimit: party.guestLimit,
        currentCount: currentGuestCount
      });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ error: 'Planilha vazia' });
    }

    let guests = data.map(row => {
      const name = row.nome || row.Nome || row.NOME || row.name || row.Name;
      const phone = String(row.telefone || row.Telefone || row.TELEFONE || row.phone || row.Phone || row.celular || row.Celular || '').replace(/\D/g, '');
      const contactMethod = (row.contato || row.Contato || row.metodo || 'WHATSAPP').toUpperCase().includes('LIGA') ? 'LIGACAO' : 'WHATSAPP';

      return { name, phone, contactMethod, partyId: id };
    }).filter(g => g.name && g.phone);

    if (guests.length === 0) {
      return res.status(400).json({
        error: 'Nenhum convidado válido encontrado. Certifique-se de que a planilha tem colunas "nome" e "telefone"'
      });
    }

    // Verificar se a planilha excede o limite
    if (guests.length > availableSlots) {
      return res.status(403).json({
        error: 'PLAN_LIMIT_EXCEEDED',
        message: `Sua planilha tem ${guests.length} convidados, mas você só pode adicionar mais ${availableSlots}`,
        currentPlan: party.plan,
        guestLimit: party.guestLimit,
        currentCount: currentGuestCount,
        availableSlots: availableSlots,
        fileGuestCount: guests.length
      });
    }

    const createdGuests = await prisma.guest.createMany({
      data: guests,
      skipDuplicates: true
    });

    res.status(201).json({
      message: `${createdGuests.count} convidados importados com sucesso`,
      count: createdGuests.count,
      guestCount: currentGuestCount + createdGuests.count,
      guestLimit: party.guestLimit
    });
  } catch (error) {
    console.error('Erro ao importar convidados:', error);
    res.status(500).json({ error: 'Erro ao importar convidados' });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const { id } = req.params;

    const party = await prisma.party.findFirst({
      where: { id, userId: req.user.id },
      include: {
        guests: true
      }
    });

    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    const guestsByStatus = {
      NAO_RESPONDEU: party.guests.filter(g => g.status === 'NAO_RESPONDEU'),
      CONFIRMOU_PRESENCA: party.guests.filter(g => g.status === 'CONFIRMOU_PRESENCA'),
      RECUSOU_CONVITE: party.guests.filter(g => g.status === 'RECUSOU_CONVITE'),
      NECESSITA_CONVERSAR: party.guests.filter(g => g.status === 'NECESSITA_CONVERSAR')
    };

    res.json({
      party: {
        id: party.id,
        name: party.name,
        date: party.date,
        partyType: party.partyType
      },
      stats: {
        total: party.guests.length,
        confirmados: guestsByStatus.CONFIRMOU_PRESENCA.length,
        recusados: guestsByStatus.RECUSOU_CONVITE.length,
        pendentes: guestsByStatus.NAO_RESPONDEU.length,
        necessitaConversar: guestsByStatus.NECESSITA_CONVERSAR.length
      },
      guestsByStatus
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
  }
};
