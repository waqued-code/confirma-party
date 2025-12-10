const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const path = require('path');

const AUTH_FOLDER = path.join(__dirname, '../../whatsapp-auth');

let sock = null;
let isConnected = false;
let connectionPromise = null;

/**
 * Inicializa a conexão com WhatsApp
 */
async function initialize() {
    if (connectionPromise) return connectionPromise;

    connectionPromise = new Promise(async (resolve) => {
        try {
            const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

            sock = makeWASocket({
                auth: state,
                browser: ['Confirma.Party', 'Chrome', '120.0.0']
            });

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect } = update;

                if (connection === 'close') {
                    isConnected = false;
                    const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                    console.log('[WhatsApp] Conexão fechada:', lastDisconnect?.error?.message);

                    if (shouldReconnect) {
                        console.log('[WhatsApp] Reconectando...');
                        connectionPromise = null;
                        setTimeout(() => initialize(), 3000);
                    }
                } else if (connection === 'open') {
                    isConnected = true;
                    console.log('[WhatsApp] Conectado com sucesso!');
                    console.log('[WhatsApp] Número:', sock.user?.id?.split(':')[0]);
                    resolve(true);
                }
            });

            sock.ev.on('messages.upsert', async (m) => {
                const msg = m.messages[0];
                if (!msg.key.fromMe && m.type === 'notify') {
                    const sender = msg.key.remoteJid;
                    const text = msg.message?.conversation ||
                                msg.message?.extendedTextMessage?.text ||
                                '';

                    if (text) {
                        console.log(`[WhatsApp] Mensagem de ${sender}: ${text}`);
                        // Aqui você pode processar a mensagem com o webhook controller
                        await processIncomingMessage(sender, text, msg.pushName);
                    }
                }
            });

        } catch (error) {
            console.error('[WhatsApp] Erro ao inicializar:', error);
            connectionPromise = null;
            resolve(false);
        }
    });

    return connectionPromise;
}

/**
 * Processa mensagens recebidas
 */
async function processIncomingMessage(remoteJid, messageContent, pushName) {
    try {
        // Importa o controller de webhook para processar
        const webhookController = require('../controllers/webhook.controller');

        // Simula o formato de dados da Evolution API
        const data = {
            key: {
                remoteJid,
                fromMe: false
            },
            message: {
                conversation: messageContent
            },
            pushName
        };

        await webhookController.processEvolutionMessageDirect(data);
    } catch (error) {
        console.error('[WhatsApp] Erro ao processar mensagem:', error);
    }
}

/**
 * Envia mensagem de texto
 */
async function sendTextMessage(phone, message) {
    try {
        if (!isConnected || !sock) {
            console.log('[WhatsApp] Não conectado, tentando reconectar...');
            await initialize();
        }

        // Formata o número para o padrão do WhatsApp
        let formattedPhone = phone.replace(/\D/g, '');
        if (!formattedPhone.startsWith('55')) {
            formattedPhone = '55' + formattedPhone;
        }
        const jid = formattedPhone + '@s.whatsapp.net';

        await sock.sendMessage(jid, { text: message });

        console.log(`[WhatsApp] Mensagem enviada para ${phone}`);
        return { success: true };
    } catch (error) {
        console.error('[WhatsApp] Erro ao enviar mensagem:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Verifica se está conectado
 */
function getConnectionStatus() {
    return {
        connected: isConnected,
        number: sock?.user?.id?.split(':')[0] || null
    };
}

module.exports = {
    initialize,
    sendTextMessage,
    getConnectionStatus
};
