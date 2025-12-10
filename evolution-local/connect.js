const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const path = require('path');

const AUTH_FOLDER = path.join(__dirname, 'auth_info');

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['Confirma.Party', 'Chrome', '120.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n📱 Escaneie o QR Code abaixo com seu WhatsApp:\n');
            qrcode.generate(qr, { small: true });
            console.log('\n⏳ Aguardando escaneamento...\n');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('❌ Conexão fechada:', lastDisconnect?.error?.message);

            if (shouldReconnect) {
                console.log('🔄 Reconectando...');
                connectToWhatsApp();
            } else {
                console.log('📴 Deslogado. Execute novamente para reconectar.');
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp conectado com sucesso!');
            console.log('📞 Número:', sock.user?.id?.split(':')[0]);
            console.log('\n🎉 Pronto! O WhatsApp está conectado ao Confirma.Party\n');

            // Envia mensagem de teste
            const testNumber = '5567984672975@s.whatsapp.net';
            try {
                await sock.sendMessage(testNumber, {
                    text: '🎉 *Confirma.Party* conectado com sucesso!\n\nEste é um teste automático.'
                });
                console.log('📤 Mensagem de teste enviada para 67984672975');
            } catch (err) {
                console.log('⚠️ Não foi possível enviar mensagem de teste:', err.message);
            }
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.key.fromMe && m.type === 'notify') {
            const sender = msg.key.remoteJid;
            const text = msg.message?.conversation ||
                        msg.message?.extendedTextMessage?.text ||
                        '[mídia]';
            console.log(`📩 Mensagem de ${sender}: ${text}`);
        }
    });

    return sock;
}

console.log('🚀 Iniciando conexão com WhatsApp...\n');
connectToWhatsApp();
