const { PrismaClient } = require('@prisma/client');
const stripeService = require('../services/stripe.service');

const prisma = new PrismaClient();

// Configuração dos planos
const PLANS = {
  GRATUITO: { limit: 15, price: 0 },
  FESTA: { limit: 50, price: 3700 },      // R$37,00 em centavos
  CELEBRACAO: { limit: 150, price: 7700 }, // R$77,00 em centavos
  PERSONALIZADO: { limit: 9999, price: null } // Sob consulta
};

// Obter informações dos planos disponíveis
exports.getPlans = async (req, res) => {
  try {
    const plans = [
      { id: 'GRATUITO', name: 'Gratuito', limit: 15, price: 0, priceFormatted: 'Grátis' },
      { id: 'FESTA', name: 'Festa', limit: 50, price: 3700, priceFormatted: 'R$ 37,00' },
      { id: 'CELEBRACAO', name: 'Celebração', limit: 150, price: 7700, priceFormatted: 'R$ 77,00' },
      { id: 'PERSONALIZADO', name: 'Personalizado', limit: 9999, price: null, priceFormatted: 'Sob consulta' }
    ];
    res.json(plans);
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    res.status(500).json({ error: 'Erro ao buscar planos' });
  }
};

// Calcular preço do upgrade
exports.calculateUpgrade = async (req, res) => {
  try {
    const { partyId, targetPlan } = req.body;

    if (!partyId || !targetPlan) {
      return res.status(400).json({ error: 'partyId e targetPlan são obrigatórios' });
    }

    const party = await prisma.party.findFirst({
      where: { id: partyId, userId: req.user.id }
    });

    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    const currentPlan = PLANS[party.plan];
    const newPlan = PLANS[targetPlan];

    if (!newPlan) {
      return res.status(400).json({ error: 'Plano inválido' });
    }

    if (newPlan.price === null) {
      return res.status(400).json({
        error: 'CONTACT_REQUIRED',
        message: 'Entre em contato para plano personalizado'
      });
    }

    if (newPlan.limit <= currentPlan.limit) {
      return res.status(400).json({ error: 'O novo plano deve ser maior que o atual' });
    }

    // Calcular preço (se já pagou algo, desconta)
    const amountPaid = currentPlan.price;
    const amountToPay = newPlan.price - amountPaid;

    res.json({
      currentPlan: party.plan,
      targetPlan,
      currentLimit: currentPlan.limit,
      newLimit: newPlan.limit,
      amountToPay,
      amountToPayFormatted: `R$ ${(amountToPay / 100).toFixed(2).replace('.', ',')}`
    });
  } catch (error) {
    console.error('Erro ao calcular upgrade:', error);
    res.status(500).json({ error: 'Erro ao calcular upgrade' });
  }
};

// Criar sessão de checkout com Stripe
exports.createCheckout = async (req, res) => {
  try {
    const { partyId, targetPlan, successUrl, cancelUrl } = req.body;

    if (!partyId || !targetPlan) {
      return res.status(400).json({ error: 'partyId e targetPlan são obrigatórios' });
    }

    const party = await prisma.party.findFirst({
      where: { id: partyId, userId: req.user.id },
      include: { user: { select: { email: true } } }
    });

    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    const newPlan = PLANS[targetPlan];
    if (!newPlan || newPlan.price === null) {
      return res.status(400).json({ error: 'Plano inválido' });
    }

    const currentPlan = PLANS[party.plan];
    const amount = newPlan.price - currentPlan.price;

    if (amount <= 0) {
      return res.status(400).json({ error: 'O novo plano deve ser maior que o atual' });
    }

    // Criar registro de pagamento pendente
    const payment = await prisma.payment.create({
      data: {
        amount,
        plan: targetPlan,
        status: 'PENDING',
        partyId
      }
    });

    // Criar sessão no Stripe
    const { sessionId, url } = await stripeService.createCheckoutSession({
      paymentId: payment.id,
      plan: targetPlan,
      amount,
      customerEmail: party.user.email,
      successUrl,
      cancelUrl
    });

    // Salvar ID da sessão
    await prisma.payment.update({
      where: { id: payment.id },
      data: { externalId: sessionId }
    });

    res.json({
      paymentId: payment.id,
      sessionId,
      checkoutUrl: url,
      amount,
      amountFormatted: `R$ ${(amount / 100).toFixed(2).replace('.', ',')}`
    });
  } catch (error) {
    console.error('Erro ao criar checkout:', error);
    res.status(500).json({ error: 'Erro ao criar checkout' });
  }
};

// Verificar status de pagamento por session ID (após redirect)
exports.verifySession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const sessionData = await stripeService.getSessionStatus(sessionId);

    if (sessionData.status === 'paid' && sessionData.paymentId) {
      // Buscar pagamento
      const payment = await prisma.payment.findUnique({
        where: { id: sessionData.paymentId }
      });

      if (payment && payment.status === 'PENDING') {
        // Confirmar pagamento
        const newPlan = PLANS[payment.plan];

        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'PAID' }
          }),
          prisma.party.update({
            where: { id: payment.partyId },
            data: {
              plan: payment.plan,
              guestLimit: newPlan.limit
            }
          })
        ]);

        return res.json({
          success: true,
          message: 'Pagamento confirmado!',
          newPlan: payment.plan,
          newLimit: newPlan.limit
        });
      }
    }

    res.json({
      success: sessionData.status === 'paid',
      status: sessionData.status
    });
  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
    res.status(500).json({ error: 'Erro ao verificar pagamento' });
  }
};

// Confirmar pagamento manualmente (para testes)
exports.confirmPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { party: { select: { userId: true } } }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    // Verificar se o usuário é dono da festa
    if (payment.party.userId !== req.user.id) {
      return res.status(403).json({ error: 'Permissão negada' });
    }

    if (payment.status === 'PAID') {
      return res.status(400).json({ error: 'Pagamento já foi confirmado' });
    }

    // Atualizar pagamento e plano
    const newPlan = PLANS[payment.plan];

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'PAID' }
      }),
      prisma.party.update({
        where: { id: payment.partyId },
        data: {
          plan: payment.plan,
          guestLimit: newPlan.limit
        }
      })
    ]);

    res.json({
      message: 'Pagamento confirmado com sucesso',
      newPlan: payment.plan,
      newLimit: newPlan.limit
    });
  } catch (error) {
    console.error('Erro ao confirmar pagamento:', error);
    res.status(500).json({ error: 'Erro ao confirmar pagamento' });
  }
};

// Webhook do Stripe (recebe notificações de pagamento)
exports.stripeWebhook = async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];

    let event;
    try {
      event = stripeService.constructWebhookEvent(req.body, signature);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    // Processar eventos
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const paymentId = session.metadata?.paymentId;

        if (paymentId && session.payment_status === 'paid') {
          const payment = await prisma.payment.findUnique({
            where: { id: paymentId }
          });

          if (payment && payment.status === 'PENDING') {
            const newPlan = PLANS[payment.plan];

            await prisma.$transaction([
              prisma.payment.update({
                where: { id: paymentId },
                data: {
                  status: 'PAID',
                  paymentMethod: session.payment_method_types?.[0] || 'card'
                }
              }),
              prisma.party.update({
                where: { id: payment.partyId },
                data: {
                  plan: payment.plan,
                  guestLimit: newPlan.limit
                }
              })
            ]);

            console.log(`Pagamento ${paymentId} confirmado via webhook`);
          }
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object;
        const paymentId = session.metadata?.paymentId;

        if (paymentId) {
          await prisma.payment.update({
            where: { id: paymentId },
            data: { status: 'FAILED' }
          });
          console.log(`Pagamento ${paymentId} expirado`);
        }
        break;
      }

      default:
        console.log(`Evento Stripe não tratado: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Erro no webhook Stripe:', error);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
};

// Atualizar plano manualmente (admin)
exports.manualUpgrade = async (req, res) => {
  try {
    const { partyId, plan } = req.body;

    if (!partyId || !plan) {
      return res.status(400).json({ error: 'partyId e plan são obrigatórios' });
    }

    const newPlan = PLANS[plan];
    if (!newPlan) {
      return res.status(400).json({ error: 'Plano inválido' });
    }

    const party = await prisma.party.findFirst({
      where: { id: partyId, userId: req.user.id }
    });

    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    await prisma.party.update({
      where: { id: partyId },
      data: {
        plan: plan,
        guestLimit: newPlan.limit
      }
    });

    res.json({
      success: true,
      message: 'Plano atualizado com sucesso',
      newPlan: plan,
      newLimit: newPlan.limit
    });
  } catch (error) {
    console.error('Erro ao atualizar plano:', error);
    res.status(500).json({ error: 'Erro ao atualizar plano' });
  }
};

// Histórico de pagamentos de uma festa
exports.getPaymentHistory = async (req, res) => {
  try {
    const { partyId } = req.params;

    const party = await prisma.party.findFirst({
      where: { id: partyId, userId: req.user.id }
    });

    if (!party) {
      return res.status(404).json({ error: 'Festa não encontrada' });
    }

    const payments = await prisma.payment.findMany({
      where: { partyId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(payments);
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico de pagamentos' });
  }
};
