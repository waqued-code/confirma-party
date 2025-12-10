require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth.routes');
const partyRoutes = require('./routes/party.routes');
const guestRoutes = require('./routes/guest.routes');
const aiRoutes = require('./routes/ai.routes');
const whatsappRoutes = require('./routes/whatsapp.routes');
const webhookRoutes = require('./routes/webhook.routes');
const paymentRoutes = require('./routes/payment.routes');
const followupRoutes = require('./routes/followup.routes');
const messageFlowRoutes = require('./routes/messageFlow.routes');
const paymentController = require('./controllers/payment.controller');

const prisma = new PrismaClient();
const app = express();

// Middlewares
app.use(cors({
  origin: [
    'https://confirma.party',
    'http://confirma.party',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://confirma-party.onrender.com',
    'https://confirma-party-web.onrender.com',
    /\.onrender\.com$/  // Qualquer subdomínio do Render
  ],
  credentials: true
}));

// Stripe webhook precisa do raw body (ANTES do express.json())
app.post('/api/payments/webhook/stripe',
  express.raw({ type: 'application/json' }),
  paymentController.stripeWebhook
);

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/message-flow', messageFlowRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo deu errado!' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🎉 Confirma.Party API rodando na porta ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
