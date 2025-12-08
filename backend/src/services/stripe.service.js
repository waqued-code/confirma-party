const Stripe = require('stripe');

// Initialize Stripe only if key is available
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
} else {
  console.warn('STRIPE_SECRET_KEY not configured - payment features disabled');
}

// Configuração dos planos com Price IDs do Stripe
// Você precisa criar esses produtos/preços no Dashboard do Stripe
const PLAN_PRICES = {
  FESTA: process.env.STRIPE_PRICE_FESTA || null,         // R$37,00
  CELEBRACAO: process.env.STRIPE_PRICE_CELEBRACAO || null // R$77,00
};

// Criar sessão de checkout
exports.createCheckoutSession = async ({
  paymentId,
  plan,
  amount,
  customerEmail,
  successUrl,
  cancelUrl
}) => {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }
  try {
    // Se tiver Price ID configurado, usa ele
    const priceId = PLAN_PRICES[plan];

    let sessionConfig = {
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: customerEmail,
      success_url: successUrl || `${process.env.FRONTEND_URL || 'https://confirma.party'}/app/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL || 'https://confirma.party'}/app/payment/cancel`,
      metadata: {
        paymentId,
        plan
      }
    };

    if (priceId) {
      // Usar preço pré-configurado do Stripe
      sessionConfig.line_items = [{
        price: priceId,
        quantity: 1
      }];
    } else {
      // Criar preço dinâmico
      sessionConfig.line_items = [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: `Confirma.Party - Plano ${plan}`,
            description: plan === 'FESTA'
              ? 'Até 50 famílias convidadas'
              : 'Até 150 famílias convidadas'
          },
          unit_amount: amount // Valor em centavos
        },
        quantity: 1
      }];
    }

    // Adicionar Pix como método de pagamento (Brasil)
    sessionConfig.payment_method_types = ['card', 'boleto'];

    // Pix via Stripe (se disponível na conta)
    // sessionConfig.payment_method_options = { pix: { expires_after_seconds: 86400 } };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return {
      sessionId: session.id,
      url: session.url
    };
  } catch (error) {
    console.error('Erro ao criar sessão Stripe:', error);
    throw error;
  }
};

// Verificar status de uma sessão
exports.getSessionStatus = async (sessionId) => {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return {
      status: session.payment_status,
      paymentId: session.metadata?.paymentId,
      plan: session.metadata?.plan,
      customerEmail: session.customer_email
    };
  } catch (error) {
    console.error('Erro ao buscar sessão Stripe:', error);
    throw error;
  }
};

// Construir evento do webhook
exports.constructWebhookEvent = (payload, signature) => {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.warn('STRIPE_WEBHOOK_SECRET não configurado');
    return null;
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, endpointSecret);
  } catch (error) {
    console.error('Erro ao verificar webhook:', error);
    throw error;
  }
};

// Criar reembolso
exports.createRefund = async (paymentIntentId) => {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId
    });
    return refund;
  } catch (error) {
    console.error('Erro ao criar reembolso:', error);
    throw error;
  }
};

module.exports = exports;
