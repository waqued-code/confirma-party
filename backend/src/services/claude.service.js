const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Gera uma mensagem de convite personalizada para a festa
 */
exports.generateInviteMessage = async (party) => {
  const partyDate = new Date(party.date).toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const prompt = `Você é um especialista em criar mensagens de convite para festas via WhatsApp.

INFORMAÇÕES DA FESTA:
- Nome do evento: ${party.name}
- Tipo de evento: ${party.partyType}
- Data: ${partyDate}
${party.observations ? `- Detalhes importantes: ${party.observations}` : ''}

DIRETRIZES OBRIGATÓRIAS (WhatsApp Business API):
1. NÃO use linguagem promocional excessiva (evite "IMPERDÍVEL", "INCRÍVEL", múltiplas exclamações)
2. NÃO use CAPS LOCK excessivo
3. NÃO inclua links ou URLs
4. A mensagem deve parecer pessoal, como se fosse enviada por um amigo
5. Evite parecer spam ou mensagem automatizada

ESTRUTURA DA MENSAGEM:
1. Saudação calorosa e pessoal usando {nome_convidado} para personalizar
2. Mencione claramente o nome do evento: "${party.name}"
3. Informe a data de forma natural
4. Inclua os detalhes das observações de forma fluida (se houver)
5. Peça confirmação de presença de forma gentil
6. Tom adequado ao tipo de festa (${party.partyType})

FORMATO:
- Use formatação WhatsApp com moderação: *negrito* para destaques importantes
- Máximo 400 caracteres
- Quebre em parágrafos curtos para facilitar leitura
- Termine com uma pergunta sobre confirmação

EXEMPLO DE PLACEHOLDER:
Use exatamente {nome_convidado} onde o nome do convidado deve aparecer.

Responda APENAS com a mensagem final, sem explicações ou comentários.`;

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
