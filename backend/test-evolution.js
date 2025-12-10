require('dotenv').config();
const evolutionService = require('./src/services/evolution.service');

async function testEvolution() {
  console.log('🔍 Testando Evolution API...');
  console.log('URL:', process.env.EVOLUTION_API_URL);
  console.log('Instance:', process.env.EVOLUTION_INSTANCE);
  console.log('');

  try {
    // 1. Verificar status da instância
    console.log('1️⃣ Verificando status da instância...');
    const status = await evolutionService.getInstanceStatus();
    console.log('   Status:', status);
  } catch (error) {
    console.log('   Instância não existe. Criando...');

    try {
      // 2. Criar instância
      console.log('\n2️⃣ Criando instância...');
      const instance = await evolutionService.createInstance();
      console.log('   Instância criada!');
      console.log('   QR Code Base64:', instance.qrcode?.base64?.substring(0, 50) + '...');

      if (instance.qrcode?.base64) {
        console.log('\n📱 Escaneie o QR Code no WhatsApp para conectar!');
        console.log('   Acesse: ' + process.env.EVOLUTION_API_URL + '/manager');
      }
    } catch (createError) {
      console.error('   Erro ao criar instância:', createError.message);
    }
  }
}

testEvolution().catch(console.error);
