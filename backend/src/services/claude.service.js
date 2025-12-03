const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Gera uma mensagem de convite personalizada para a festa
 */
exports.generateInviteMessage = async (party) => {
  const prompt = `Você é um assistente especializado em criar mensagens de convite para festas.

Crie uma mensagem de convite para WhatsApp para a seguinte festa:
- Nome da festa: ${party.name}
- Tipo: ${party.partyType}
- Data: ${new Date(party.date).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
${party.observations ? `- Observações: ${party.observations}` : ''}

A mensagem deve:
1. Ser calorosa e convidativa
2. Incluir todas as informações importantes
3. Ter um tom adequado ao tipo de festa
4. Perguntar se a pessoa confirma presença
5. Ser formatada para WhatsApp (usar *negrito* e _itálico_ quando apropriado)
6. Ter no máximo 500 caracteres
7. Incluir {nome_convidado} onde o nome do convidado deve aparecer

Responda apenas com a mensagem, sem explicações.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
};

/**
 * Processa a resposta de um convidado e determina o status
 */
exports.processGuestResponse = async (guestMessage, partyContext) => {
  const prompt = `Você é um assistente que analisa respostas de convidados para festas.

Contexto da festa:
- Nome: ${partyContext.partyName}
- Tipo: ${partyContext.partyType}
- Data: ${partyContext.partyDate}

Mensagem do convidado: "${guestMessage}"

Analise a mensagem e retorne um JSON com:
1. "status": um dos seguintes valores:
   - "CONFIRMOU_PRESENCA" (se confirmou que vai)
   - "RECUSOU_CONVITE" (se disse que não vai)
   - "NECESSITA_CONVERSAR" (se tem dúvidas, pediu mais informações, ou precisa falar com o organizador)
   - "NAO_RESPONDEU" (se a mensagem não é uma resposta clara)

2. "resposta": uma resposta educada e apropriada para enviar ao convidado (máximo 200 caracteres)

3. "resumo": um breve resumo do que o convidado disse (máximo 100 caracteres)

Responda apenas com o JSON válido, sem markdown ou explicações.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }]
  });

  try {
    return JSON.parse(response.content[0].text);
  } catch (error) {
    console.error('Erro ao parsear resposta da IA:', error);
    return {
      status: 'NECESSITA_CONVERSAR',
      resposta: 'Obrigado pela sua resposta! O organizador da festa entrará em contato em breve.',
      resumo: 'Resposta não processada automaticamente'
    };
  }
};

/**
 * Gera uma resposta conversacional para continuar o diálogo
 */
exports.generateConversationalResponse = async (conversationHistory, partyContext) => {
  const systemPrompt = `Você é um assistente virtual educado que ajuda a confirmar presença em festas.

Contexto da festa:
- Nome: ${partyContext.partyName}
- Tipo: ${partyContext.partyType}
- Data: ${partyContext.partyDate}
- Nome do organizador: ${partyContext.organizerName}

Suas responsabilidades:
1. Responder dúvidas sobre a festa de forma educada
2. Tentar obter confirmação de presença
3. Se não souber responder algo específico, dizer que o organizador entrará em contato
4. Manter respostas curtas e adequadas para WhatsApp (máximo 300 caracteres)
5. Ser sempre cordial e profissional`;

  const messages = conversationHistory.map(msg => ({
    role: msg.isFromAI ? 'assistant' : 'user',
    content: msg.content
  }));

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    system: systemPrompt,
    messages
  });

  return response.content[0].text;
};
