/**
 * WhatsApp Baileys Service - Otimizado para Render
 *
 * Usa PostgreSQL para persistir o estado de autenticação,
 * garantindo que a sessão seja mantida mesmo após reinícios do servidor.
 */

const { default: makeWASocket, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { PrismaClient } = require('@prisma/client');
const QRCode = require('qrcode');
const pino = require('pino');

const prisma = new PrismaClient();

// Estado global da conexão
let sock = null;
let connectionState = {
  status: 'disconnected', // 'disconnected' | 'connecting' | 'qr_pending' | 'connected'
  qrCode: null,
  qrDataUrl: null,
  phoneNumber: null,
  lastError: null,
  reconnectAttempts: 0
};

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000;

/**
 * Custom Auth State usando PostgreSQL
 * Armazena credenciais e chaves no banco de dados
 */
async function useDatabaseAuthState(authId = 'default') {
  // Busca ou cria o registro de auth
  let authRecord = await prisma.whatsAppAuth.findUnique({
    where: { id: authId }
  });

  if (!authRecord) {
    authRecord = await prisma.whatsAppAuth.create({
      data: { id: authId }
    });
  }

  // Parse das credenciais existentes
  let creds = authRecord.creds ? JSON.parse(authRecord.creds) : null;

  // Função para buscar chaves do banco
  const readData = async (key) => {
    try {
      const record = await prisma.whatsAppAuthKey.findUnique({
        where: { id: `${authId}:${key}` }
      });
      return record ? JSON.parse(record.data) : null;
    } catch (error) {
      console.error(`[WhatsApp] Erro ao ler chave ${key}:`, error.message);
      return null;
    }
  };

  // Função para salvar chaves no banco
  const writeData = async (key, data) => {
    try {
      await prisma.whatsAppAuthKey.upsert({
        where: { id: `${authId}:${key}` },
        create: {
          id: `${authId}:${key}`,
          authId,
          data: JSON.stringify(data)
        },
        update: {
          data: JSON.stringify(data)
        }
      });
    } catch (error) {
      console.error(`[WhatsApp] Erro ao salvar chave ${key}:`, error.message);
    }
  };

  // Função para remover chaves do banco
  const removeData = async (key) => {
    try {
      await prisma.whatsAppAuthKey.delete({
        where: { id: `${authId}:${key}` }
      }).catch(() => {}); // Ignora se não existir
    } catch (error) {
      // Ignora erro se a chave não existir
    }
  };

  return {
    state: {
      creds: creds || {
        noiseKey: undefined,
        signedIdentityKey: undefined,
        signedPreKey: undefined,
        registrationId: undefined,
        advSecretKey: undefined,
        nextPreKeyId: undefined,
        firstUnuploadedPreKeyId: undefined,
        serverHasPreKeys: undefined,
        account: undefined,
        me: undefined,
        signalIdentities: undefined,
        lastAccountSyncTimestamp: undefined,
        myAppStateKeyId: undefined
      },
      keys: {
        get: async (type, ids) => {
          const data = {};
          for (const id of ids) {
            const value = await readData(`${type}-${id}`);
            if (value) {
              if (type === 'app-state-sync-key') {
                data[id] = { keyData: value };
              } else {
                data[id] = value;
              }
            }
          }
          return data;
        },
        set: async (data) => {
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              if (value) {
                await writeData(`${category}-${id}`, value);
              } else {
                await removeData(`${category}-${id}`);
              }
            }
          }
        }
      }
    },
    saveCreds: async () => {
      await prisma.whatsAppAuth.update({
        where: { id: authId },
        data: { creds: JSON.stringify(creds) }
      });
    }
  };
}

/**
 * Inicializa a conexão com WhatsApp
 */
async function initialize() {
  if (sock && connectionState.status === 'connected') {
    console.log('[WhatsApp] Já conectado');
    return true;
  }

  if (connectionState.status === 'connecting') {
    console.log('[WhatsApp] Já em processo de conexão...');
    return false;
  }

  connectionState.status = 'connecting';
  connectionState.lastError = null;

  try {
    console.log('[WhatsApp] Iniciando conexão...');

    // Busca versão mais recente do Baileys
    const { version } = await fetchLatestBaileysVersion();
    console.log(`[WhatsApp] Usando versão WA: ${version.join('.')}`);

    // Usa auth state do banco de dados
    const { state, saveCreds } = await useDatabaseAuthState();

    // Cria o socket
    sock = makeWASocket({
      version,
      auth: state,
      browser: ['Confirma.Party', 'Chrome', '120.0.0'],
      logger: pino({ level: 'silent' }), // Silencia logs do Baileys
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      retryRequestDelayMs: 250,
      maxMsgRetryCount: 3,
      generateHighQualityLinkPreview: false
    });

    // Handler de atualização de credenciais
    sock.ev.on('creds.update', saveCreds);

    // Handler de atualização de conexão
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // QR Code disponível
      if (qr) {
        connectionState.status = 'qr_pending';
        connectionState.qrCode = qr;

        // Gera QR Code como Data URL para exibir no frontend
        try {
          connectionState.qrDataUrl = await QRCode.toDataURL(qr, {
            width: 256,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' }
          });
        } catch (err) {
          console.error('[WhatsApp] Erro ao gerar QR Code:', err);
        }

        console.log('[WhatsApp] QR Code disponível - escaneie para conectar');
        console.log('[WhatsApp] QR:', qr.substring(0, 50) + '...');
      }

      // Conexão estabelecida
      if (connection === 'open') {
        connectionState.status = 'connected';
        connectionState.qrCode = null;
        connectionState.qrDataUrl = null;
        connectionState.phoneNumber = sock.user?.id?.split(':')[0] || null;
        connectionState.reconnectAttempts = 0;

        console.log('[WhatsApp] ✅ Conectado com sucesso!');
        console.log(`[WhatsApp] Número: ${connectionState.phoneNumber}`);
      }

      // Conexão fechada
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        connectionState.status = 'disconnected';
        connectionState.lastError = lastDisconnect?.error?.message || 'Conexão fechada';

        console.log(`[WhatsApp] Conexão fechada: ${connectionState.lastError}`);
        console.log(`[WhatsApp] Código: ${statusCode}, Reconectar: ${shouldReconnect}`);

        // Se foi deslogado, limpa as credenciais
        if (statusCode === DisconnectReason.loggedOut) {
          console.log('[WhatsApp] Deslogado - limpando credenciais...');
          await clearAuthState();
        }

        // Tenta reconectar se não foi deslogado manualmente
        if (shouldReconnect && connectionState.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          connectionState.reconnectAttempts++;
          console.log(`[WhatsApp] Tentando reconectar (${connectionState.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

          setTimeout(() => {
            sock = null;
            initialize();
          }, RECONNECT_DELAY * connectionState.reconnectAttempts);
        } else if (connectionState.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.log('[WhatsApp] Máximo de tentativas de reconexão atingido');
          connectionState.lastError = 'Máximo de tentativas de reconexão atingido';
        }
      }
    });

    // Handler de mensagens recebidas
    sock.ev.on('messages.upsert', async (m) => {
      const msg = m.messages[0];
      if (!msg.key.fromMe && m.type === 'notify') {
        const sender = msg.key.remoteJid;
        const text = msg.message?.conversation ||
                    msg.message?.extendedTextMessage?.text ||
                    '';

        if (text && sender) {
          console.log(`[WhatsApp] 📩 Mensagem de ${sender}: ${text.substring(0, 50)}...`);
          await processIncomingMessage(sender, text, msg.pushName);
        }
      }
    });

    return true;
  } catch (error) {
    console.error('[WhatsApp] Erro ao inicializar:', error);
    connectionState.status = 'disconnected';
    connectionState.lastError = error.message;
    return false;
  }
}

/**
 * Processa mensagens recebidas
 */
async function processIncomingMessage(remoteJid, messageContent, pushName) {
  try {
    // Importa o controller de webhook para processar
    const webhookController = require('../controllers/webhook.controller');

    // Verifica se a função existe
    if (typeof webhookController.processEvolutionMessageDirect === 'function') {
      const data = {
        key: { remoteJid, fromMe: false },
        message: { conversation: messageContent },
        pushName
      };
      await webhookController.processEvolutionMessageDirect(data);
    }
  } catch (error) {
    console.error('[WhatsApp] Erro ao processar mensagem:', error.message);
  }
}

/**
 * Envia mensagem de texto
 */
async function sendTextMessage(phone, message) {
  try {
    if (!sock || connectionState.status !== 'connected') {
      console.log('[WhatsApp] Não conectado, tentando inicializar...');
      await initialize();

      // Aguarda até 10 segundos pela conexão
      let attempts = 0;
      while (connectionState.status !== 'connected' && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      if (connectionState.status !== 'connected') {
        return {
          success: false,
          error: 'WhatsApp não conectado. Escaneie o QR Code primeiro.'
        };
      }
    }

    // Formata o número para o padrão do WhatsApp
    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = '55' + formattedPhone;
    }
    const jid = formattedPhone + '@s.whatsapp.net';

    // Verifica se o número existe no WhatsApp
    const [exists] = await sock.onWhatsApp(jid);
    if (!exists?.exists) {
      console.log(`[WhatsApp] Número ${phone} não encontrado no WhatsApp`);
      return {
        success: false,
        error: 'Número não encontrado no WhatsApp'
      };
    }

    // Envia a mensagem
    const result = await sock.sendMessage(jid, { text: message });

    console.log(`[WhatsApp] ✅ Mensagem enviada para ${phone}`);
    return { success: true, messageId: result.key.id };
  } catch (error) {
    console.error('[WhatsApp] Erro ao enviar mensagem:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Envia mensagens em lote com delay entre cada uma
 */
async function sendBulkMessages(messages, delayMs = 3000) {
  const results = [];

  for (const msg of messages) {
    const result = await sendTextMessage(msg.phone, msg.message);
    results.push({ ...msg, ...result });

    // Delay entre mensagens para evitar ban
    if (messages.indexOf(msg) < messages.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Verifica se um número existe no WhatsApp
 */
async function checkNumberExists(phone) {
  try {
    if (!sock || connectionState.status !== 'connected') {
      return { exists: false, error: 'WhatsApp não conectado' };
    }

    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = '55' + formattedPhone;
    }
    const jid = formattedPhone + '@s.whatsapp.net';

    const [result] = await sock.onWhatsApp(jid);
    return {
      exists: result?.exists || false,
      jid: result?.jid
    };
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

/**
 * Retorna o status atual da conexão
 */
function getConnectionStatus() {
  return {
    status: connectionState.status,
    connected: connectionState.status === 'connected',
    phoneNumber: connectionState.phoneNumber,
    qrCode: connectionState.qrCode,
    qrDataUrl: connectionState.qrDataUrl,
    lastError: connectionState.lastError,
    reconnectAttempts: connectionState.reconnectAttempts
  };
}

/**
 * Gera um novo QR Code (força reconexão)
 */
async function generateNewQRCode() {
  console.log('[WhatsApp] Gerando novo QR Code...');

  // Fecha conexão existente
  if (sock) {
    try {
      sock.end();
    } catch (e) {}
    sock = null;
  }

  // Limpa credenciais
  await clearAuthState();

  // Reseta estado
  connectionState = {
    status: 'disconnected',
    qrCode: null,
    qrDataUrl: null,
    phoneNumber: null,
    lastError: null,
    reconnectAttempts: 0
  };

  // Inicia nova conexão
  await initialize();

  // Aguarda QR Code estar disponível
  let attempts = 0;
  while (!connectionState.qrDataUrl && attempts < 30) {
    await new Promise(resolve => setTimeout(resolve, 500));
    attempts++;
  }

  return getConnectionStatus();
}

/**
 * Limpa o estado de autenticação do banco de dados
 */
async function clearAuthState(authId = 'default') {
  try {
    // Remove todas as chaves
    await prisma.whatsAppAuthKey.deleteMany({
      where: { authId }
    });

    // Reseta as credenciais
    await prisma.whatsAppAuth.update({
      where: { id: authId },
      data: { creds: null }
    }).catch(() => {});

    console.log('[WhatsApp] Estado de autenticação limpo');
  } catch (error) {
    console.error('[WhatsApp] Erro ao limpar auth state:', error);
  }
}

/**
 * Desconecta do WhatsApp
 */
async function disconnect() {
  if (sock) {
    try {
      await sock.logout();
    } catch (e) {}
    sock = null;
  }

  connectionState.status = 'disconnected';
  connectionState.phoneNumber = null;
  connectionState.qrCode = null;
  connectionState.qrDataUrl = null;
}

module.exports = {
  initialize,
  sendTextMessage,
  sendBulkMessages,
  checkNumberExists,
  getConnectionStatus,
  generateNewQRCode,
  clearAuthState,
  disconnect
};
